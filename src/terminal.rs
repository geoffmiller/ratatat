use napi_derive::napi;
use std::io::stdout;
use crossterm::{
    terminal::{enable_raw_mode, disable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    cursor::{Hide, Show},
    execute,
};

#[napi]
pub struct TerminalSetup {}

#[napi]
impl TerminalSetup {
    #[napi]
    pub fn enter() -> napi::Result<()> {
        enable_raw_mode().map_err(|e| napi::Error::from_reason(e.to_string()))?;
        execute!(stdout(), EnterAlternateScreen, Hide).map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(())
    }

    #[napi]
    pub fn leave() -> napi::Result<()> {
        disable_raw_mode().map_err(|e| napi::Error::from_reason(e.to_string()))?;
        execute!(stdout(), LeaveAlternateScreen, Show).map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(())
    }

    #[napi]
    pub fn get_size() -> napi::Result<Vec<u32>> {
        let (cols, rows) = crossterm::terminal::size().map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(vec![cols as u32, rows as u32])
    }
}
