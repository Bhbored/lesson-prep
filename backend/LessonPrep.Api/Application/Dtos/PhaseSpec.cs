using System.ComponentModel.DataAnnotations;

namespace LessonPrep.Api.Application.Dtos;

public sealed record PhaseSpec(
    [Required, StringLength(80, MinimumLength = 1)] string Name,
    [Range(1, 240)] int DurationMinutes,
    [Range(1, 12)] int Order);
