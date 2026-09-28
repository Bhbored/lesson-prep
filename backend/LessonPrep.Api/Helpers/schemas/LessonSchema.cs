using System.Text.Json;

namespace LessonPrep.Api.Helpers.Schemas;

public static class LessonSchema
{
    public const string Json = """
    {"type":"object","additionalProperties":false,"properties":{
      "title":{"type":"string"},"topic":{"type":"string"},"className":{"type":"string"},
      "totalDurationMinutes":{"type":"integer"},
      "learningObjectives":{"type":"array","items":{"type":"string"}},
      "requiredMaterials":{"type":"array","items":{"type":"string"}},
      "phases":{"type":"array","items":{"type":"object","additionalProperties":false,"properties":{
        "name":{"type":"string"},"durationMinutes":{"type":"integer"},"objective":{"type":"string"},
        "teacherActions":{"type":"array","items":{"type":"string"}},
        "studentActions":{"type":"array","items":{"type":"string"}},
        "questions":{"type":"array","items":{"type":"string"}},"notes":{"type":"string"}},
        "required":["name","durationMinutes","objective","teacherActions","studentActions","questions","notes"]}},
      "assessmentSummary":{"type":"string"},"expectedOutcomes":{"type":"array","items":{"type":"string"}},
      "teacherNotes":{"type":"string"}},
      "required":["title","topic","className","totalDurationMinutes","learningObjectives","requiredMaterials","phases","assessmentSummary","expectedOutcomes","teacherNotes"]}
    """;

    public static JsonElement Element => JsonDocument.Parse(Json).RootElement.Clone();
}
