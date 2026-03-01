pub fn get_fg_ansi(color: u8) -> String {
    if color == 255 {
        return "\x1b[39m".to_string(); // Terminal default foreground
    }
    format!("\x1b[38;5;{}m", color)
}

pub fn get_bg_ansi(color: u8) -> String {
    if color == 255 {
        return "\x1b[49m".to_string(); // Terminal default background
    }
    format!("\x1b[48;5;{}m", color)
}

pub fn get_styles_ansi(styles: u8) -> String {
    let mut seq = String::new();
    if styles == 0 {
        return "\x1b[0m".to_string(); // Reset
    }
    if styles & 1 != 0 { seq.push_str("\x1b[1m"); } // Bold
    if styles & 2 != 0 { seq.push_str("\x1b[2m"); } // Dim
    if styles & 4 != 0 { seq.push_str("\x1b[3m"); } // Italic
    if styles & 8 != 0 { seq.push_str("\x1b[4m"); } // Underline
    if styles & 16 != 0 { seq.push_str("\x1b[5m"); } // Blink
    if styles & 32 != 0 { seq.push_str("\x1b[7m"); } // Invert
    if styles & 64 != 0 { seq.push_str("\x1b[8m"); } // Hidden
    if styles & 128 != 0 { seq.push_str("\x1b[9m"); } // Strikethrough
    seq
}

pub fn move_cursor(x: u16, y: u16) -> String {
    format!("\x1b[{};{}H", y + 1, x + 1)
}

