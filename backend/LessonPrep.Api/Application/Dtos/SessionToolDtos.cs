using System.ComponentModel.DataAnnotations;
using LessonPrep.Api.Application.Enums;

namespace LessonPrep.Api.Application.Dtos;

public sealed record SessionToolRequest(
    [Required] PreparationSnapshot Snapshot,
    [Required] GeneratedLesson Session,
    [Required, AllowedValues("worksheet", "quiz", "game")] string Tool,
    [Required, EnumDataType(typeof(AiProvider))] AiProvider Provider,
    [Required, StringLength(150, MinimumLength = 1)] string Model,
    [Required, MinLength(1)] string CredentialToken);

public sealed record ExerciseItemDto(
    string Prompt,
    string Type,
    List<string>? Options,
    string Answer,
    string? Explanation);

public sealed record ExerciseSetDto(
    string Title,
    string Instructions,
    List<ExerciseItemDto> Items);

public sealed record GameQuestionDto(
    string Prompt,
    List<string> Options,
    int CorrectIndex,
    string? Explanation);

public sealed record GameStageDto(
    string Prompt,
    List<string> Options,
    int CorrectIndex,
    string? Success,
    string? Miss);

public sealed record GamePairDto(string Left, string Right);

public sealed record GameAdventureDto(List<GameStageDto> Stages);

public sealed record GameMatchingDto(List<GamePairDto> Pairs);

public sealed record GameRaceDto(List<GameQuestionDto> Rounds);

public sealed record GameDto(
    string Title,
    string Kind,
    string? Hook,
    string? Host,
    string? PresetId,
    string? Band,
    GameAdventureDto? Adventure,
    GameMatchingDto? Matching,
    GameRaceDto? Race);
