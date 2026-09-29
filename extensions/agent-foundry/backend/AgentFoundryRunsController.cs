using Duplo.Ai.DataManagement.AccessControl;
using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.AgentFoundry;

/// <summary>Workspace-scoped REST controller for Agent Foundry runs (full CRUD + results/status via the SDK base).</summary>
[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/agentfoundry-runs")]
[AccessControl(Parent = typeof(Workspace), ParentIdProperty = "OwnerWorkspaceId")]
public class AgentFoundryRunsController : ResourcesController<AgentFoundryRun, AgentFoundryRunSpec, AgentFoundryRunResult>
{
    public AgentFoundryRunsController(IEntityService<AgentFoundryRun> service, ILogger<AgentFoundryRunsController> logger)
        : base(service, logger)
    {
    }
}
