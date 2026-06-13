# Workflow Automation - Quick Start Implementation

## 🎯 MVP: Get Started in 1 Week

This guide shows you how to implement a **minimal viable workflow system** in SecurePR AI.

---

## 📦 Phase 1: Core Engine (Days 1-3)

### Day 1: Database Schema

```sql
-- workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,  -- 'finding_detected', 'scan_completed', 'schedule'
    trigger_config JSONB NOT NULL,
    nodes JSONB NOT NULL,               -- Workflow node definitions
    edges JSONB NOT NULL,               -- Connections between nodes
    enabled BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- workflow_executions table
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id),
    status VARCHAR(50) NOT NULL,        -- 'running', 'completed', 'failed'
    trigger_data JSONB,                 -- Data that triggered workflow
    execution_log JSONB,                -- Step-by-step logs
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT
);

-- indexes
CREATE INDEX idx_workflows_enabled ON workflows(enabled);
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
```

---

### Day 2: Workflow Engine

```python
# backend/app/services/workflow_engine.py
from typing import Dict, List, Any
import asyncio
from datetime import datetime

class WorkflowEngine:
    """
    Simple workflow execution engine.
    Executes nodes in order based on edges.
    """
    
    def __init__(self):
        self.node_registry = {}
        self._register_builtin_nodes()
    
    def _register_builtin_nodes(self):
        """Register built-in node types."""
        self.register_node('action.slack_message', SlackMessageNode())
        self.register_node('action.block_pr_merge', BlockPRMergeNode())
        self.register_node('condition.if', IfConditionNode())
    
    def register_node(self, node_type: str, node_handler):
        """Register a custom node type."""
        self.node_registry[node_type] = node_handler
    
    async def execute_workflow(
        self, 
        workflow: Dict[str, Any], 
        trigger_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a workflow with given trigger data.
        
        Args:
            workflow: Workflow definition (nodes, edges)
            trigger_data: Data from the trigger event
        
        Returns:
            Execution result with logs
        """
        execution_id = str(uuid.uuid4())
        context = {
            'trigger': trigger_data,
            'variables': {},
            'execution_id': execution_id,
        }
        
        logs = []
        
        try:
            # Start from trigger node
            current_nodes = self._get_starting_nodes(workflow['edges'])
            
            while current_nodes:
                next_nodes = []
                
                for node_id in current_nodes:
                    node = self._find_node(workflow['nodes'], node_id)
                    if not node:
                        continue
                    
                    # Execute node
                    log_entry = await self._execute_node(node, context)
                    logs.append(log_entry)
                    
                    # Find next nodes
                    next_nodes.extend(
                        self._get_next_nodes(workflow['edges'], node_id, context)
                    )
                
                current_nodes = next_nodes
            
            return {
                'status': 'completed',
                'logs': logs,
                'context': context,
            }
        
        except Exception as e:
            return {
                'status': 'failed',
                'error': str(e),
                'logs': logs,
            }
    
    async def _execute_node(self, node: Dict, context: Dict) -> Dict:
        """Execute a single node."""
        node_type = node['type']
        node_handler = self.node_registry.get(node_type)
        
        if not node_handler:
            raise ValueError(f"Unknown node type: {node_type}")
        
        start_time = datetime.now()
        
        try:
            result = await node_handler.execute(node['config'], context)
            
            # Store result in context
            context['variables'][node['id']] = result
            
            return {
                'node_id': node['id'],
                'node_type': node_type,
                'status': 'success',
                'result': result,
                'duration': (datetime.now() - start_time).total_seconds(),
            }
        
        except Exception as e:
            return {
                'node_id': node['id'],
                'node_type': node_type,
                'status': 'failed',
                'error': str(e),
                'duration': (datetime.now() - start_time).total_seconds(),
            }
    
    def _get_starting_nodes(self, edges: List[Dict]) -> List[str]:
        """Get nodes with no incoming edges (start nodes)."""
        targets = {e['target'] for e in edges}
        sources = {e['source'] for e in edges}
        return list(sources - targets)
    
    def _get_next_nodes(
        self, 
        edges: List[Dict], 
        current_node: str,
        context: Dict
    ) -> List[str]:
        """Get next nodes based on edges."""
        next_nodes = []
        
        for edge in edges:
            if edge['source'] == current_node:
                # Check condition if exists
                if 'condition' in edge:
                    if self._evaluate_condition(edge['condition'], context):
                        next_nodes.append(edge['target'])
                else:
                    next_nodes.append(edge['target'])
        
        return next_nodes
    
    def _find_node(self, nodes: List[Dict], node_id: str) -> Dict | None:
        """Find node by ID."""
        return next((n for n in nodes if n['id'] == node_id), None)
    
    def _evaluate_condition(self, condition: str, context: Dict) -> bool:
        """Evaluate a simple condition."""
        # Simple implementation - expand as needed
        # Example: "severity == 'critical'"
        try:
            return eval(condition, {}, context)
        except:
            return False


# Node Handlers
class SlackMessageNode:
    """Send a Slack message."""
    
    async def execute(self, config: Dict, context: Dict) -> Dict:
        """Send message to Slack."""
        channel = config['channel']
        message = self._interpolate(config['message'], context)
        
        # Call Slack API
        response = await slack_client.post_message(channel, message)
        
        return {
            'message_id': response['ts'],
            'channel': channel,
        }
    
    def _interpolate(self, template: str, context: Dict) -> str:
        """Replace {{variables}} in template."""
        import re
        
        def replace(match):
            var_path = match.group(1)
            value = self._get_nested(context, var_path)
            return str(value) if value is not None else ''
        
        return re.sub(r'\{\{(.+?)\}\}', replace, template)
    
    def _get_nested(self, data: Dict, path: str):
        """Get nested value from dict using dot notation."""
        keys = path.split('.')
        value = data
        for key in keys:
            value = value.get(key)
            if value is None:
                return None
        return value


class BlockPRMergeNode:
    """Block PR from merging."""
    
    async def execute(self, config: Dict, context: Dict) -> Dict:
        """Set GitHub commit status to failure."""
        pr_info = context['trigger']['pr']
        
        await github_client.create_status(
            owner=pr_info['owner'],
            repo=pr_info['repo'],
            sha=pr_info['head_sha'],
            state='failure',
            context='SecurePR AI / Workflow',
            description=config['message']
        )
        
        return {'blocked': True}


class IfConditionNode:
    """Conditional branching."""
    
    async def execute(self, config: Dict, context: Dict) -> Dict:
        """Evaluate condition and set branch."""
        condition = config['condition']
        result = eval(condition, {}, context)
        
        context['variables']['last_condition'] = result
        
        return {'result': result}
```

---

### Day 3: API Endpoints

```python
# backend/app/api/routes/workflows.py
from fastapi import APIRouter, HTTPException
from typing import List
from app.services.workflow_engine import WorkflowEngine
from app.models.workflow import Workflow, WorkflowExecution

router = APIRouter(prefix='/workflows', tags=['workflows'])
engine = WorkflowEngine()


@router.post('/')
async def create_workflow(workflow: Workflow):
    """Create a new workflow."""
    # Save to database
    await db.workflows.insert(workflow.dict())
    return {'id': workflow.id, 'created': True}


@router.get('/')
async def list_workflows():
    """List all workflows."""
    workflows = await db.workflows.find({'enabled': True}).to_list()
    return {'workflows': workflows}


@router.get('/{workflow_id}')
async def get_workflow(workflow_id: str):
    """Get workflow by ID."""
    workflow = await db.workflows.find_one({'id': workflow_id})
    if not workflow:
        raise HTTPException(404, 'Workflow not found')
    return workflow


@router.post('/{workflow_id}/execute')
async def execute_workflow(workflow_id: str, trigger_data: dict):
    """Manually execute a workflow."""
    workflow = await db.workflows.find_one({'id': workflow_id})
    if not workflow:
        raise HTTPException(404, 'Workflow not found')
    
    # Execute
    result = await engine.execute_workflow(workflow, trigger_data)
    
    # Save execution
    execution = WorkflowExecution(
        workflow_id=workflow_id,
        status=result['status'],
        trigger_data=trigger_data,
        execution_log=result['logs'],
        started_at=datetime.now(),
        completed_at=datetime.now(),
        error_message=result.get('error')
    )
    await db.executions.insert(execution.dict())
    
    return result


@router.get('/{workflow_id}/executions')
async def list_executions(workflow_id: str, limit: int = 50):
    """List workflow execution history."""
    executions = await db.executions.find(
        {'workflow_id': workflow_id}
    ).sort('started_at', -1).limit(limit).to_list()
    
    return {'executions': executions}


# Event hook - trigger workflows when events occur
async def trigger_workflows_for_event(event_type: str, event_data: dict):
    """
    Trigger all workflows matching this event.
    Called from elsewhere in the app (e.g., when scan completes).
    """
    # Find matching workflows
    workflows = await db.workflows.find({
        'enabled': True,
        'trigger_type': event_type
    }).to_list()
    
    # Execute each workflow
    for workflow in workflows:
        # Check trigger config matches
        if _matches_trigger_config(workflow['trigger_config'], event_data):
            asyncio.create_task(
                engine.execute_workflow(workflow, event_data)
            )


def _matches_trigger_config(config: dict, data: dict) -> bool:
    """Check if event data matches trigger config."""
    # Example: config = {'severity': ['critical', 'high']}
    #          data = {'severity': 'critical'}
    for key, expected in config.items():
        actual = data.get(key)
        if isinstance(expected, list):
            if actual not in expected:
                return False
        elif actual != expected:
            return False
    return True
```

---

## 📦 Phase 2: Simple UI (Days 4-5)

### Day 4: Workflow List Page

```typescript
// frontend/src/ui/pages/WorkflowsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  enabled: boolean;
  created_at: string;
}

export const WorkflowsPage: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    const response = await fetch('/api/workflows');
    const data = await response.json();
    setWorkflows(data.workflows);
    setLoading(false);
  };

  const toggleWorkflow = async (id: string, enabled: boolean) => {
    await fetch(`/api/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled })
    });
    fetchWorkflows();
  };

  return (
    <div style={{ padding: theme.spacing['2xl'] }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
      }}>
        <h1 style={{
          fontFamily: theme.fonts.ui,
          fontSize: '22px',
          color: theme.colors.text,
        }}>
          Workflows
        </h1>
        <button
          onClick={() => navigate('/workflows/new')}
          style={{
            padding: '10px 20px',
            background: theme.colors.blue,
            color: 'white',
            border: 'none',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
          }}
        >
          + Create Workflow
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{
          display: 'grid',
          gap: theme.spacing.lg,
        }}>
          {workflows.map(workflow => (
            <div
              key={workflow.id}
              style={{
                background: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.xl,
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontFamily: theme.fonts.ui,
                    fontSize: '16px',
                    color: theme.colors.text,
                    marginBottom: theme.spacing.sm,
                  }}>
                    {workflow.name}
                  </h3>
                  <p style={{
                    fontFamily: theme.fonts.ui,
                    fontSize: '13px',
                    color: theme.colors.text2,
                    marginBottom: theme.spacing.md,
                  }}>
                    {workflow.description}
                  </p>
                  <div style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: '11px',
                    color: theme.colors.text3,
                  }}>
                    Trigger: {workflow.trigger_type} • Created {new Date(workflow.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                  <button
                    onClick={() => toggleWorkflow(workflow.id, workflow.enabled)}
                    style={{
                      padding: '6px 12px',
                      background: workflow.enabled ? theme.colors.green : theme.colors.surface2,
                      color: workflow.enabled ? 'white' : theme.colors.text2,
                      border: `1px solid ${workflow.enabled ? theme.colors.green : theme.colors.border2}`,
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {workflow.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                  
                  <button
                    onClick={() => navigate(`/workflows/${workflow.id}`)}
                    style={{
                      padding: '6px 12px',
                      background: theme.colors.surface2,
                      color: theme.colors.text2,
                      border: `1px solid ${theme.colors.border2}`,
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

### Day 5: Simple Workflow Builder

```typescript
// frontend/src/ui/pages/WorkflowBuilderPage.tsx
import React, { useState } from 'react';
import { theme } from '../theme';

export const WorkflowBuilderPage: React.FC = () => {
  const [workflow, setWorkflow] = useState({
    name: '',
    description: '',
    trigger_type: 'finding_detected',
    trigger_config: { severity: ['critical'] },
    nodes: [],
    edges: [],
  });

  const saveWorkflow = async () => {
    await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    // Redirect to list
  };

  return (
    <div style={{ padding: theme.spacing['2xl'] }}>
      <h1>Create Workflow</h1>
      
      {/* Basic Form (MVP) */}
      <div style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label style={{
            display: 'block',
            marginBottom: theme.spacing.sm,
            fontFamily: theme.fonts.mono,
            fontSize: '11px',
            color: theme.colors.text2,
          }}>
            Workflow Name
          </label>
          <input
            value={workflow.name}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              background: theme.colors.bg2,
              border: `1px solid ${theme.colors.border2}`,
              borderRadius: theme.radius.sm,
              color: theme.colors.text,
            }}
            placeholder="e.g., Critical Issue Alert"
          />
        </div>

        <div style={{ marginBottom: theme.spacing.lg }}>
          <label style={{
            display: 'block',
            marginBottom: theme.spacing.sm,
            fontFamily: theme.fonts.mono,
            fontSize: '11px',
            color: theme.colors.text2,
          }}>
            Description
          </label>
          <textarea
            value={workflow.description}
            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              background: theme.colors.bg2,
              border: `1px solid ${theme.colors.border2}`,
              borderRadius: theme.radius.sm,
              color: theme.colors.text,
              minHeight: '80px',
            }}
            placeholder="What does this workflow do?"
          />
        </div>

        <div style={{ marginBottom: theme.spacing.lg }}>
          <label style={{
            display: 'block',
            marginBottom: theme.spacing.sm,
            fontFamily: theme.fonts.mono,
            fontSize: '11px',
            color: theme.colors.text2,
          }}>
            Trigger
          </label>
          <select
            value={workflow.trigger_type}
            onChange={(e) => setWorkflow({ ...workflow, trigger_type: e.target.value })}
            style={{
              width: '100%',
              padding: '10px',
              background: theme.colors.bg2,
              border: `1px solid ${theme.colors.border2}`,
              borderRadius: theme.radius.sm,
              color: theme.colors.text,
            }}
          >
            <option value="finding_detected">Finding Detected</option>
            <option value="scan_completed">Scan Completed</option>
            <option value="schedule">Schedule</option>
          </select>
        </div>

        <button
          onClick={saveWorkflow}
          style={{
            padding: '10px 20px',
            background: theme.colors.blue,
            color: 'white',
            border: 'none',
            borderRadius: theme.radius.sm,
            cursor: 'pointer',
          }}
        >
          Save Workflow
        </button>
      </div>
    </div>
  );
};
```

---

## 🧪 Testing (Days 6-7)

### Test Workflow Execution

```python
# tests/test_workflow_engine.py
import pytest
from app.services.workflow_engine import WorkflowEngine

@pytest.mark.asyncio
async def test_simple_workflow():
    engine = WorkflowEngine()
    
    workflow = {
        'nodes': [
            {
                'id': 'node1',
                'type': 'action.slack_message',
                'config': {
                    'channel': '#test',
                    'message': 'Alert: {{trigger.finding.title}}'
                }
            }
        ],
        'edges': []
    }
    
    trigger_data = {
        'finding': {
            'title': 'SQL Injection',
            'severity': 'critical'
        }
    }
    
    result = await engine.execute_workflow(workflow, trigger_data)
    
    assert result['status'] == 'completed'
    assert len(result['logs']) == 1
    assert result['logs'][0]['status'] == 'success'
```

---

## 🎉 Launch Checklist

- [ ] Database schema created
- [ ] Workflow engine implemented
- [ ] API endpoints working
- [ ] Basic UI for listing workflows
- [ ] Basic UI for creating workflows
- [ ] Integration with existing scan pipeline
- [ ] Documentation written
- [ ] Tests passing
- [ ] Deploy to staging
- [ ] Beta user testing
- [ ] Production launch

---

**With this MVP, you can build and execute basic workflows in 1 week!** 🚀

**Next:** Expand with visual builder, more integrations, templates, and analytics.
