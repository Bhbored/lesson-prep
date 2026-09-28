using LessonPrep.Api.Application.Contracts.Lessons;
using LessonPrep.Api.Application.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace LessonPrep.Api.Controllers.v1.Lessons;

public sealed class LessonFlowPresetsController : BaseController
{
    [HttpGet]
    public ActionResult<LessonFlowPresetDto[]> Get() => Ok(new[] { StandardLessonFlow.Create() });
}
