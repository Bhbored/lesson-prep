using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LessonPrep.Api.Controllers;

[Route("lessonprep/v{version:apiVersion}/[controller]")]
[ApiController]
[ApiVersion("1.0")]
[EnableRateLimiting("reads")]
public class BaseController : ControllerBase
{
}
