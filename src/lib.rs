#![deny(clippy::all)]

#[cfg(not(unix))] // Move the import specific to non-unix
use std::io::{self, Write};
use napi_derive::napi;
use napi::bindgen_prelude::Uint32Array;

mod ansi;
mod terminal;

#[napi]
pub struct Renderer {
    pub width: u16,
    pub height: u16,
    front_buffer: Vec<u32>,
}

#[napi]
impl Renderer {
    #[napi(constructor)]
    pub fn new(width: u16, height: u16) -> Self {
        Self {
            width,
            height,
            front_buffer: vec![0; (width as usize) * (height as usize) * 2],
        }
    }

    #[napi]
    pub fn render(&mut self, back_buffer: Uint32Array) {
        let output = self.generate_diff(back_buffer.as_ref());
        if !output.is_empty() {
            self.write_posix(output.as_bytes());
        }
    }

    pub fn generate_diff(&mut self, back_buffer: &[u32]) -> String {
        let mut output = String::new();
        // Reserve arbitrary capacity to prevent frequent reallocations
        output.reserve(8192); 

        let mut current_x: i32 = -1;
        let mut current_y: i32 = -1;

        let mut last_fg = 255;
        let mut last_bg = 255;
        let mut last_style = 0;

        // Ensure starting state is reset
        output.push_str("\x1b[0m");

        let cols = self.width as usize;

        for i in 0..((self.width as usize) * (self.height as usize)) {
            let offset = i * 2;
            let char_code = back_buffer[offset];
            let attr_code = back_buffer[offset + 1];

            if char_code != self.front_buffer[offset] || attr_code != self.front_buffer[offset + 1] {
                // Determine layout
                let x = (i % cols) as u16;
                let y = (i / cols) as u16;

                // Only move cursor if not contiguous
                if current_x + 1 != x as i32 || current_y != y as i32 {
                    output.push_str(&ansi::move_cursor(x, y));
                }

                current_x = x as i32;
                current_y = y as i32;

                // Extract values (attr: fg 8 bits, bg 8 bits, styles 8 bits)
                let fg = (attr_code & 0xFF) as u8;
                let bg = ((attr_code >> 8) & 0xFF) as u8;
                let styles = ((attr_code >> 16) & 0xFF) as u8;

                let ch = char::from_u32(char_code).unwrap_or(' ');

                // Diff Styles
                if styles != last_style {
                    output.push_str(&ansi::get_styles_ansi(styles));
                    last_style = styles;

                    // Style reset can clear colors, so force color redraw
                    if styles == 0 {
                        last_fg = 255;
                        last_bg = 255;
                    }
                }

                // Diff Colors
                if fg != last_fg {
                    output.push_str(&ansi::get_fg_ansi(fg));
                    last_fg = fg;
                }

                if bg != last_bg {
                    output.push_str(&ansi::get_bg_ansi(bg));
                    last_bg = bg;
                }

                output.push(ch);
                self.front_buffer[offset] = char_code;
                self.front_buffer[offset + 1] = attr_code;
            }
        }
        output
    }

    #[cfg(unix)]
    fn write_posix(&self, data: &[u8]) {
        unsafe {
            libc::write(1, data.as_ptr() as *const libc::c_void, data.len());
        }
    }

    #[cfg(not(unix))]
    fn write_posix(&self, data: &[u8]) {
        let mut out = io::stdout().lock();
        let _ = out.write_all(data);
        let _ = out.flush();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_diffing_engine_empty() {
        let mut renderer = Renderer::new(10, 10);
        let back_buffer = vec![0; 200];
        let diff = renderer.generate_diff(&back_buffer);
        // It outputs nothing if there are no changes except the reset code
        assert_eq!(diff, "\x1b[0m");
    }

    #[test]
    fn test_diffing_engine_single_char() {
        let mut renderer = Renderer::new(10, 10);
        let mut back_buffer = vec![0; 200];
        // Write 'A' to (1, 1), which is index 11
        // offset 22, 23
        back_buffer[22] = 'A' as u32; 
        back_buffer[23] = ((0 as u32) << 16) | ((2 as u32) << 8) | (1 as u32);

        let diff = renderer.generate_diff(&back_buffer);
        // Should contain reset + move_cursor + fg + bg + 'A'
        assert!(diff.contains("\x1b[2;2H")); // Move cursor to (1,1) -> row 2, col 2
        assert!(diff.contains("\x1b[38;5;1m")); // FG 1
        assert!(diff.contains("\x1b[48;5;2m")); // BG 2
        assert!(diff.ends_with("A"));
    }
}