using System.ComponentModel.DataAnnotations;
using LessonPrep.Api.Application.Enums;

namespace LessonPrep.Api.Application.Dtos;

public sealed record PreparationSnapshot(
    [Required] Guid PreparationId,
    [Required, StringLength(100, MinimumLength = 1)] string ClassName,
    [Range(10, 240)] int TotalDurationMinutes,
    [Required, AllowedValues("en", "ar", "fr")] string SourceLanguage,
    [Required, MinLength(1), MaxLength(12)] List<PhaseSpec> Phases,
    [Required, StringLength(200_000, MinimumLength = 30)] string SourceText,
    [Required(AllowEmptyStrings = true), StringLength(60_000)] string PreparedSourceText,
    [Range(1, 6)] int SessionCount = 1,
    [Required(AllowEmptyStrings = true), StringLength(2_000)] string MaterialNote = "");

public sealed record RegenerateRequest(
    [Required] PreparationSnapshot Snapshot,
    [Range(1, 3)] int VariantCount,
    [Range(1, 10_000)] int GenerationRound,
    [Required, EnumDataType(typeof(AiProvider))] AiProvider Provider,
    [Required, StringLength(150, MinimumLength = 1)] string Model,
    [Required, MinLength(1)] string CredentialToken);
