using System.ComponentModel.DataAnnotations;

namespace LessonPrep.Api.Application.Dtos;

public sealed record LessonAiRequest(
    [Required, StringLength(100, MinimumLength = 1)] string ClassName,
    [Range(10, 240)] int DurationMinutes,
    [Required, AllowedValues("en", "ar", "fr")] string SourceLanguage,
    [Required, MinLength(1), MaxLength(12)] IReadOnlyList<PhaseSpec> Phases,
    [Required, StringLength(200_000, MinimumLength = 30)] string SourceText,
    [Required, StringLength(10_000)] string PreviousApproaches,
    [Range(1, 6)] int SessionNumber = 1,
    [Range(1, 6)] int SessionCount = 1,
    [Required, StringLength(10_000)] string PriorSessions = "",
    [Required(AllowEmptyStrings = true), StringLength(2_000)] string MaterialNote = "",
    [StringLength(2_000)] string ValidationFeedback = "");
