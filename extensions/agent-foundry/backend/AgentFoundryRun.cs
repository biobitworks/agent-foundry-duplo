using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.AgentFoundry;

// THIN ADAPTER resource. A Duplo ticket is an Agent Foundry run. The typed resource only carries the request
// (spec) and a SUMMARY of the comparison (result). The comparison itself is computed by the canonical
// Agent Foundry runtime (biobitworks/agent-foundry); nothing is recomputed or duplicated here.

/// <summary>User-supplied inputs for one Agent Foundry run.</summary>
[BsonIgnoreExtraElements]
public class AgentFoundryRunSpec : BaseSpec
{
    /// <summary>Text screened by the Antigence deterministic core and by the local model (max 600 chars).</summary>
    public string? InputText { get; set; }

    /// <summary>Variant model: lfm1p2b (default) or lfm350m. The 2.6B model is excluded (strict-JSON gate failed).</summary>
    public string? Model { get; set; }
}

/// <summary>Summary written back by the provisioning skill from the canonical comparison object.</summary>
[BsonIgnoreExtraElements]
public class AgentFoundryRunResult : BaseResult
{
    public string? Headline { get; set; }
    public string? ChangedOutcome { get; set; }
    public string? Divergence { get; set; }
    public string? FirstDivergence { get; set; }
    public string? ControlIdentity { get; set; }
    public string? VariantIdentity { get; set; }
    public string? RunA { get; set; }
    public string? RunB { get; set; }
    public string? Explanation { get; set; }
    public string? Replay { get; set; }
    public string? InspectorUrl { get; set; }
    public string? CanonicalInputContentId { get; set; }
    public List<string>? AffectedClaims { get; set; }
    public List<string>? FailuresAndAbstentions { get; set; }
}

[BsonCollection("extension_agentfoundry_runs")]
[BsonIgnoreExtraElements]
public class AgentFoundryRun : ResourceBase<AgentFoundryRunSpec, AgentFoundryRunResult>
{
    public override string GetTicketOriginType() => "AgentFoundryRun";
    public override string GetTicketOriginSubType() => "agent-foundry-run";
}

/// <summary>No-op hooks (framework default).</summary>
public class AgentFoundryRunHooks : DefaultEntityHooks<AgentFoundryRun>
{
}

public class AgentFoundryRunService : ResourceServiceBase<AgentFoundryRun, AgentFoundryRunSpec, AgentFoundryRunResult>
{
    public AgentFoundryRunService(
        IRepository<AgentFoundryRun> repository,
        ILogger<AgentFoundryRunService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
    }
}
