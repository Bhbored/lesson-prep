using System.Text.Json;

namespace LessonPrep.Api.Helpers.Schemas;

public static class SessionToolSchemas
{
    public static JsonElement ExerciseSet { get; } = JsonDocument.Parse("""
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "title": { "type": "string" },
            "instructions": { "type": "string" },
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": false,
                "properties": {
                  "prompt": { "type": "string" },
                  "type": { "type": "string", "enum": ["short", "multiple_choice", "true_false", "fill_blank"] },
                  "options": { "type": "array", "items": { "type": "string" } },
                  "answer": { "type": "string" },
                  "explanation": { "type": "string" }
                },
                "required": ["prompt", "type", "options", "answer", "explanation"]
              }
            }
          },
          "required": ["title", "instructions", "items"]
        }
        """).RootElement.Clone();

    public static JsonElement Game { get; } = JsonDocument.Parse("""
        {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "title": { "type": "string" },
            "kind": { "type": "string", "enum": ["quiz", "matching"] },
            "quiz": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "questions": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "prompt": { "type": "string" },
                      "options": { "type": "array", "items": { "type": "string" } },
                      "correctIndex": { "type": "integer" },
                      "explanation": { "type": "string" }
                    },
                    "required": ["prompt", "options", "correctIndex", "explanation"]
                  }
                }
              },
              "required": ["questions"]
            },
            "matching": {
              "type": "object",
              "additionalProperties": false,
              "properties": {
                "pairs": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                      "left": { "type": "string" },
                      "right": { "type": "string" }
                    },
                    "required": ["left", "right"]
                  }
                }
              },
              "required": ["pairs"]
            }
          },
          "required": ["title", "kind", "quiz", "matching"]
        }
        """).RootElement.Clone();
}
