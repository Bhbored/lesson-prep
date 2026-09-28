namespace LessonPrep.Api.Application.Dtos;

public sealed record LessonFlowPresetDto(
    Guid Id, string Name, string Description, bool IsDefault, List<PhaseSpec> Phases);
