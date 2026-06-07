use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, AsyncRead, BufReader};
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ServiceLogEntry {
    #[serde(rename = "serviceId")]
    pub service_id: String,
    pub stream: String,
    pub line: String,
    pub timestamp: String,
}

pub fn spawn_journal_stream(
    app_handle: tauri::AppHandle,
    service_id: String,
    unit: String,
) {
    tokio::spawn(async move {
        let mut child = match tokio::process::Command::new("journalctl")
            .args(["-u", &unit, "-f", "--no-pager", "-n", "20"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .stdin(std::process::Stdio::null())
            .kill_on_drop(true)
            .spawn()
        {
            Ok(c) => c,
            Err(_) => return,
        };

        if let Some(reader) = child.stdout.take() {
            let app = app_handle.clone();
            let id = service_id.clone();
            tokio::spawn(async move {
                stream_reader(app, id, reader).await;
            });
        }

        let _ = child.wait().await;
    });
}

async fn stream_reader<R: AsyncRead + Unpin + Send + 'static>(
    app_handle: tauri::AppHandle,
    service_id: String,
    reader: R,
) {
    let lines = BufReader::new(reader).lines();
    tokio::pin!(lines);
    while let Ok(Some(line)) = lines.next_line().await {
        let entry = ServiceLogEntry {
            service_id: service_id.clone(),
            stream: "stdout".to_string(),
            line,
            timestamp: chrono_now(),
        };
        let _ = app_handle.emit("lampd://service-log", entry);
    }
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let nanos = now.subsec_nanos();
    let total = secs % 86400;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    format!("{:02}:{:02}:{:02}.{:03}", h, m, s, nanos / 1_000_000)
}
