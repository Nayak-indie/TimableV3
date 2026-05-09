use std::env;
use std::process;

// Minimal Rust Intent Parser for Timable Intervention System
// Usage: intent-parser "Teacher A is absent today"

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Error: Missing input string.");
        process::exit(1);
    }

    let input = args[1..].join(" ").to_lowercase();
    
    // Basic heuristic NLP (In a full system, this would use an ML model or advanced NLP crate)
    let mut intent = "UNKNOWN";
    let mut target = "UNKNOWN";
    let mut urgency = "LOW";

    if input.contains("absent") || input.contains("sick") {
        intent = "EMERGENCY_SUBSTITUTION";
        urgency = "HIGH";
        if input.contains("teacher") {
            // Extract roughly the word after teacher
            let parts: Vec<&str> = input.split_whitespace().collect();
            if let Some(pos) = parts.iter().position(|&r| r == "teacher") {
                if pos + 1 < parts.length() {
                    target = parts[pos + 1];
                }
            }
        }
    } else if input.contains("regenerate") || input.contains("fix") {
        intent = "LOCALIZED_REPAIR";
        urgency = "MEDIUM";
    }

    // Output JSON for the TS orchestrator to consume
    println!(r#"{{ "intent": "{}", "target": "{}", "urgency": "{}" }}"#, intent, target, urgency);
}
