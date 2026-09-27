using LessonPrep.Api.Application.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace LessonPrep.Api.Controllers.v1;

public sealed class LessonFlowPresetsController : LessonPrepControllerBase
{
    [HttpGet]
    public ActionResult<LessonFlowPresetDto[]> Get() => Ok(new[] { StandardLessonFlow.Create() });
}
