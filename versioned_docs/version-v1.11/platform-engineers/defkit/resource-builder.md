---
title: Resource Builder
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Resource builders are the fluent API for constructing Kubernetes resource manifests in Go. They produce the CUE that becomes the `output` / `outputs` blocks of a definition template. Path syntax supports dot-notation (`spec.replicas`), array indices (`containers[0]`), and bracket notation (`labels[app.oam.dev/name]`).

## Constructors

| Constructor | Description |
|---|---|
| `defkit.NewResource(apiVersion, kind string) *Resource` | Creates a typed Kubernetes resource builder. Chain `.Set()`, `.SetIf()`, `.If()/.EndIf()`, and `.SpreadIf()` to populate fields. Pass the result to `tpl.Output()` or `tpl.Outputs(name, r)`. |
| `defkit.NewResourceWithConditionalVersion(kind string) *Resource` | Creates a resource whose `apiVersion` is determined at runtime. Chain `.VersionIf(condition, apiVersion)` clauses; the first matching condition wins. Use for K8s version differences (e.g. `autoscaling/v2beta2` vs `autoscaling/v2`). |
| `defkit.FromTyped(obj runtime.Object) (*Resource, error)` / `defkit.MustFromTyped(obj) *Resource` | Convert a Go Kubernetes object into a `*Resource` for further chaining. |

## Resource Methods

| Method | Description |
|---|---|
| `.Set(path, value)` | Sets a field at the given path. Supports dot notation (`"metadata.name"`), array indexing (`"spec.containers[0].image"`), and bracket notation (`"metadata.labels[app.oam.dev/name]"`). |
| `.SetIf(cond, path, value)` | Conditionally sets a field only when the condition is true. Generates `if cond { path: value }`. |
| `.SpreadIf(cond, path, value)` | Conditionally merges a value into a path. The condition is placed inside the target struct. Use for merging user-provided maps. |
| `.If(cond)` / `.EndIf()` | Opens/closes a conditional block. All `.Set()` calls between are wrapped in a single `if cond { ... }`. Use when several fields share a guard. |
| `.Directive(path, directive)` | Adds a CUE directive comment at the given path (e.g. `Directive("spec.containers", "patchKey=name")`). |
| `.VersionIf(cond, apiVersion)` | Sets the API version conditionally. Used with `NewResourceWithConditionalVersion()` for K8s version differences. |
| `.ConditionalStruct(cond, path, fn)` | Emits an entire named sub-struct only when the condition is true. The closure receives an `*OutputStructBuilder` exposing `Set()` and `SetIf()`. |

:::caution
Use `.ConditionalStruct()` instead of `.If()`/`.EndIf()` when the entire struct should be absent from the output when the condition is false. `.If()`/`.EndIf()` guards individual fields but still emits the parent struct as an empty `{}`.
:::

## ArrayBuilder Methods

`defkit.NewArray()` returns an `*ArrayBuilder` that produces a CUE list literal. Mix static, conditional, and comprehension-based entries in a single array.

| Method | Description |
|---|---|
| `.Item(elem)` / `.ItemIf(cond, elem)` | Adds a static / conditional element to the array. |
| `.ForEach(source, elem)` | For-comprehension over a source collection. |
| `.ForEachGuarded(guard, source, elem)` | Guarded comprehension — skips when guard is false. |
| `.ForEachWith(source, fn func(item *ItemBuilder))` | Callback iteration with access to item-builder methods. |
| `.ForEachWithVar(varName, source, fn)` | Named variable iteration — access iteration variable by name. |
| `.ForEachWithGuardedFiltered(guard, filter, source, fn)` | Full combo: guarded + filtered comprehension. |
| `.ForEachWithGuardedFilteredVar(varName, guard, filter, source, fn)` | Full combo with named variable. |

### Element & Concat Helpers

| Helper | Description |
|---|---|
| `defkit.NewArrayElement()` | Builds one element object. Methods: `.Set(key, value)`, `.SetIf(cond, key, value)`, `.PatchKeyField(field, key, value)`. |
| `defkit.ArrayConcat(left, right Value)` | Concatenates two list values using CUE's `+` operator (e.g. a builder-emitted list with a parameter array reference). |

### ItemBuilder (`ForEachWith` callback)

The closure passed to `.ForEachWith*()` receives an `*ItemBuilder` with these methods: `Var()` (access iteration variable via `.Ref()`, `.Field(name)`), `Set(field, value)`, `If(cond, fn)`, `IfSet(field, fn)`, `IfNotSet(field, fn)`, `Let(name, value)`, `SetDefault(field, defValue, typeName)`, `FieldExists(field)`, `FieldNotExists(field)`. See [ForEachWith / ItemBuilder](./foreach-item-builder.md) for the per-element builder pattern.

## List Comprehensions

Three ways to build CUE list comprehensions from array parameters or let-bound arrays.

| Helper | Description |
|---|---|
| `defkit.Each(param).Map(FieldMap)` | Iterates a parameter and maps each item using the given field map. |
| `defkit.From(param)` | Supports chained transformations: `.Filter(cond)`, `.Map(FieldMap)`, `.Dedupe(field)`, `.Guard(cond)`. |
| `defkit.ForEachIn(letVar).MapFields(FieldMap)` | Iterates a `LetVariable` (for let-bound arrays). |

## Field Helpers

| Helper | Description |
|---|---|
| `defkit.FieldRef(name)` | References the named field from the current iteration element. |
| `defkit.FieldMap{...}` | A `map[string]Value` specifying field-to-value mappings for comprehension output. |
| `defkit.FieldEquals(field, value)` | Produces a filter predicate for `defkit.From().Filter()`. |

## Helper Builder

See [Helper Builder](./template-helper-builder.md) for `tpl.Helper()`, `tpl.AddLetBinding()`, and related let-variable APIs.

## Example

Let's build a `scalable-service` component — a `Deployment` paired with a `HorizontalPodAutoscaler` whose `apiVersion` adapts to the cluster's Kubernetes version, an optional `Service` for exposed ports, and an optional `ServiceAccount`. Users supply an image, replica counts, optional CPU/memory requests, optional labels and annotations, a list of pod volumes, optional extra volume mounts and custom metrics, optional environment variables, ports, tolerations, an `affinity` toggle, and a service account name.

Behind the scenes the template exercises every API listed above in a single definition: `NewResource` plus `Set` / `SetIf` / `SpreadIf` / `If`/`EndIf` / `Directive` / `ConditionalStruct` for the `Deployment`; `NewResourceWithConditionalVersion` plus `VersionIf` for the version-aware `HPA`; `MustFromTyped` to seed the optional `ServiceAccount` from a Go type; `NewArray` mixing `Item`, `ItemIf`, `ForEach`, `ForEachGuarded`, `ForEachWith`, `ForEachWithVar`, and `ForEachWithGuardedFiltered` (the `*Var` variants take a leading iteration-variable name and are otherwise identical); `NewArrayElement` for nested element bodies; `defkit.Each(...).Map(...)` and `defkit.ForEachIn(...).MapFields(...)` for list comprehensions; `defkit.From(...)` chained with `.Filter`, `.Map`, `.Dedupe`, `.Guard`; `FieldRef`, `FieldMap`, and `FieldEquals` for field references and predicates; and `ArrayConcat` to splice user-supplied extras onto a derived list. Building on the `my-platform` module scaffolded in [Quick Start](./quick-start.md), drop the file below into `my-platform/components/`.

<Tabs groupId="defkit-example">
<TabItem value="go" label="Go — defkit">

```go
package components

import (
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

    "github.com/oam-dev/kubevela/pkg/definition/defkit"
)

func ScalableService() *defkit.ComponentDefinition {
    image              := defkit.String("image").Description("Container image")
    replicas           := defkit.Int("replicas").Default(1)
    cpu                := defkit.String("cpu").Optional()
    memory             := defkit.String("memory").Optional()
    labels             := defkit.StringKeyMap("labels").Optional()
    annotations        := defkit.StringKeyMap("annotations").Optional()
    volumes            := defkit.List("volumes").Description("Pod volumes")
    extraMounts        := defkit.Array("extraVolumeMounts").Description("Additional container volumeMounts appended via ArrayConcat — required so the generated `[...] + parameter.extraVolumeMounts` is always well-formed; pass `[]` when none are needed")
    customMetrics      := defkit.Array("customMetrics").Optional()
    minReplicas        := defkit.Int("minReplicas").Default(1)
    maxReplicas        := defkit.Int("maxReplicas").Default(10)
    env                := defkit.Array("env").Optional()
    ports              := defkit.Array("ports").Optional()
    tolerations        := defkit.Array("tolerations").Optional()
    requireAffinity    := defkit.Bool("requireAffinity").Default(false)
    serviceAccountName := defkit.String("serviceAccountName").Optional()

    return defkit.NewComponent("scalable-service").
        Description("Deployment paired with a version-aware HPA").
        Workload("apps/v1", "Deployment").
        Params(image, replicas, cpu, memory, labels, annotations,
            volumes, extraMounts, customMetrics, minReplicas, maxReplicas,
            env, ports, tolerations, requireAffinity, serviceAccountName).
        Template(scalableServiceTemplate)
}

func scalableServiceTemplate(tpl *defkit.Template) {
    vela               := defkit.VelaCtx()
    image              := defkit.String("image")
    replicas           := defkit.Int("replicas")
    cpu                := defkit.String("cpu")
    memory             := defkit.String("memory")
    labels             := defkit.StringKeyMap("labels")
    annotations        := defkit.StringKeyMap("annotations")
    volumes            := defkit.List("volumes")
    customMetrics      := defkit.Array("customMetrics")
    minReplicas        := defkit.Int("minReplicas")
    maxReplicas        := defkit.Int("maxReplicas")
    env                := defkit.Array("env")
    ports              := defkit.Array("ports")
    tolerations        := defkit.Array("tolerations")
    requireAffinity    := defkit.Bool("requireAffinity")
    serviceAccountName := defkit.String("serviceAccountName")

    // ServiceAccount built from a typed Go object — MustFromTyped.
    sa := defkit.MustFromTyped(&corev1.ServiceAccount{
        TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "ServiceAccount"},
    }).
        Set("metadata.name", serviceAccountName)
    tpl.OutputsIf(serviceAccountName.IsSet(), "serviceaccount", sa)

    // Pod-level volumes — Each + Map + FieldMap + FieldRef + NestedFieldMap.
    podVolumes := defkit.Each(volumes).Map(defkit.FieldMap{
        "name":     defkit.FieldRef("name"),
        "emptyDir": defkit.NestedFieldMap(defkit.FieldMap{}),
    })

    // Container volumeMounts — ArrayBuilder + ForEach (basic, source is required)
    // + NewArrayElement, then ArrayConcat to splice user-supplied extras.
    mountsArr := defkit.NewArray().ForEach(volumes, defkit.NewArrayElement().
        Set("name", defkit.Reference("m.name")).
        Set("mountPath", defkit.Reference("m.mountPath")))
    allMounts := defkit.ArrayConcat(mountsArr,
        defkit.ParamRef("extraVolumeMounts"))

    // Container env list — ForEachIn (top-level list-comprehension helper).
    containerEnv := defkit.ForEachIn(env).MapFields(defkit.FieldMap{
        "name":  defkit.FieldRef("name"),
        "value": defkit.FieldRef("value"),
    })

    // envFrom secret refs — From + Filter + Map + FieldEquals. Picks env
    // entries with required:true; the SetIf below already gates on env
    // presence, so a separate Guard() is unnecessary.
    envFromList := defkit.From(env).
        Filter(defkit.FieldEquals("required", true)).
        Map(defkit.FieldMap{
            "secretRef": defkit.NestedFieldMap(defkit.FieldMap{
                "name": defkit.FieldRef("name"),
            }),
        })

    // Demo of From().Dedupe().Guard() — kept here as a reference for the
    // dedupe + guard pipeline, which produces:
    //   if parameter.tolerations != _|_ {
    //       [for v in parameter.tolerations if !already-seen-by-key { v }]
    //   }
    _ = defkit.From(tolerations).Dedupe("key").Guard(tolerations.IsSet())

    // Container ports — ForEachWith with the default "v" iteration variable
    // + ItemBuilder.IfSet for the optional port name.
    containerPorts := defkit.NewArray().ForEachWith(ports, func(item *defkit.ItemBuilder) {
        v := item.Var()
        item.Set("containerPort", v.Field("port"))
        item.IfSet("name", func() { item.Set("name", v.Field("name")) })
    })

    // Pod tolerations — ForEachWithVar with named "t" iteration variable.
    tolerationsArr := defkit.NewArray().ForEachWithVar("t", tolerations, func(item *defkit.ItemBuilder) {
        t := item.Var()
        item.Set("key", t.Field("key"))
        item.Set("effect", t.Field("effect"))
        item.Set("operator", defkit.Lit("Exists"))
    })

    // Service ports — ForEachWithGuardedFiltered (default "v") for ports.expose==true.
    // ForEachWithGuardedFilteredVar takes the same arguments plus a leading
    // varName to rename the iteration variable; pair it with var-aware
    // predicates when you need a non-default name.
    servicePorts := defkit.NewArray().ForEachWithGuardedFiltered(
        ports.IsSet(),
        defkit.FieldEquals("expose", true),
        ports,
        func(item *defkit.ItemBuilder) {
            v := item.Var()
            item.Set("port", v.Field("port"))
            item.Set("targetPort", v.Field("port"))
            item.IfSet("name", func() { item.Set("name", v.Field("name")) })
        })

    // Deployment — Set / SetIf / SpreadIf / If-EndIf / Directive / ConditionalStruct.
    dep := defkit.NewResource("apps/v1", "Deployment").
        Set("metadata.name", vela.Name()).
        SetIf(annotations.IsSet(), "metadata.annotations", annotations).
        SpreadIf(labels.IsSet(), "metadata.labels", labels).
        Set("spec.replicas", replicas).
        Set("spec.selector.matchLabels[app.oam.dev/component]", vela.Name()).
        Set("spec.template.metadata.labels[app.oam.dev/component]", vela.Name()).
        SetIf(serviceAccountName.IsSet(), "spec.template.spec.serviceAccountName", serviceAccountName).
        Directive("spec.template.spec.containers", "patchKey=name").
        Set("spec.template.spec.containers[0].name", vela.Name()).
        Set("spec.template.spec.containers[0].image", image).
        SetIf(env.IsSet(), "spec.template.spec.containers[0].env", containerEnv).
        SetIf(env.IsSet(), "spec.template.spec.containers[0].envFrom", envFromList).
        SetIf(ports.IsSet(), "spec.template.spec.containers[0].ports", containerPorts).
        Set("spec.template.spec.containers[0].volumeMounts", allMounts).
        Set("spec.template.spec.volumes", podVolumes).
        SetIf(tolerations.IsSet(), "spec.template.spec.tolerations", tolerationsArr).
        If(cpu.IsSet()).
            Set("spec.template.spec.containers[0].resources.requests.cpu", cpu).
            Set("spec.template.spec.containers[0].resources.limits.cpu", cpu).
        EndIf().
        If(memory.IsSet()).
            Set("spec.template.spec.containers[0].resources.requests.memory", memory).
            Set("spec.template.spec.containers[0].resources.limits.memory", memory).
        EndIf().
        ConditionalStruct(requireAffinity.IsTrue(), "spec.template.spec.affinity.nodeAffinity", func(b *defkit.OutputStructBuilder) {
            matchExpr := defkit.NewArrayElement().
                Set("key", defkit.Lit("kubernetes.io/os")).
                Set("operator", defkit.Lit("In")).
                Set("values", defkit.Reference(`["linux"]`))
            nodeTerm := defkit.NewArrayElement().
                Set("matchExpressions", defkit.NewArray().Item(matchExpr))
            b.Set("requiredDuringSchedulingIgnoredDuringExecution", defkit.NewArrayElement().
                Set("nodeSelectorTerms", defkit.NewArray().Item(nodeTerm)))
        })

    tpl.Output(dep)

    // HPA metrics — mix Item, ItemIf, and ForEachGuarded in one array.
    cpuMetric := defkit.NewArrayElement().
        Set("type", defkit.Lit("Resource")).
        Set("resource", defkit.NewArrayElement().
            Set("name", defkit.Lit("cpu")).
            Set("target", defkit.NewArrayElement().
                Set("type", defkit.Lit("Utilization")).
                Set("averageUtilization", defkit.Lit(80))))

    memMetric := defkit.NewArrayElement().
        Set("type", defkit.Lit("Resource")).
        Set("resource", defkit.NewArrayElement().
            Set("name", defkit.Lit("memory")).
            Set("target", defkit.NewArrayElement().
                Set("type", defkit.Lit("Utilization")).
                Set("averageUtilization", defkit.Lit(70))))

    customElem := defkit.NewArrayElement().
        Set("type", defkit.Lit("Pods")).
        Set("pods", defkit.NewArrayElement().
            Set("metric", defkit.NewArrayElement().
                Set("name", defkit.Reference("m.name"))).
            Set("target", defkit.NewArrayElement().
                Set("type", defkit.Lit("AverageValue")).
                Set("averageValue", defkit.Reference("m.value"))))

    metrics := defkit.NewArray().
        Item(cpuMetric).
        ItemIf(memory.IsSet(), memMetric).
        ForEachGuarded(customMetrics.IsSet(), customMetrics, customElem)

    // HPA — apiVersion picked at runtime via VersionIf.
    hpa := defkit.NewResourceWithConditionalVersion("HorizontalPodAutoscaler").
        VersionIf(defkit.Lt(vela.ClusterVersion().Minor(), defkit.Lit(23)),
            "autoscaling/v2beta2").
        VersionIf(defkit.Ge(vela.ClusterVersion().Minor(), defkit.Lit(23)),
            "autoscaling/v2").
        Set("metadata.name", vela.Name()).
        Set("spec.scaleTargetRef.apiVersion", defkit.Lit("apps/v1")).
        Set("spec.scaleTargetRef.kind", defkit.Lit("Deployment")).
        Set("spec.scaleTargetRef.name", vela.Name()).
        Set("spec.minReplicas", minReplicas).
        Set("spec.maxReplicas", maxReplicas).
        Set("spec.metrics", metrics)

    tpl.Outputs("hpa", hpa)

    // Service — emitted only when ports is set, using the filtered list above.
    svc := defkit.NewResource("v1", "Service").
        Set("metadata.name", vela.Name()).
        Set("spec.selector[app.oam.dev/component]", vela.Name()).
        Set("spec.ports", servicePorts)
    tpl.OutputsIf(ports.IsSet(), "service", svc)
}

func init() { defkit.Register(ScalableService()) }
```

</TabItem>
<TabItem value="cue" label="CUE — generated">

```cue
"scalable-service": {
  type: "component"
  annotations: {}
  labels: {}
  description: "Deployment paired with a version-aware HPA"
  attributes: {
    workload: {
      definition: {
        apiVersion: "apps/v1"
        kind:       "Deployment"
      }
      type: "deployments.apps"
    }
  }
}
template: {
  output: {
    apiVersion: "apps/v1"
    kind:       "Deployment"
    metadata: {
      name: context.name
      if parameter["annotations"] != _|_ {
        annotations: parameter.annotations
      }
      if parameter["labels"] != _|_ {
        labels: parameter.labels
      }
    }
    spec: {
      replicas: parameter.replicas
      selector: matchLabels: "app.oam.dev/component": context.name
      template: {
        metadata: labels: "app.oam.dev/component": context.name
        spec: {
          containers: [{
            name:  context.name
            image: parameter.image
            volumeMounts: [for m in parameter.volumes {
              name:      m.name
              mountPath: m.mountPath
            }] + parameter.extraVolumeMounts
            if parameter["cpu"] != _|_ {
              resources: {
                requests: cpu: parameter.cpu
                limits:   cpu: parameter.cpu
              }
            }
            if parameter["memory"] != _|_ {
              resources: {
                requests: memory: parameter.memory
                limits:   memory: parameter.memory
              }
            }
            if parameter["env"] != _|_ {
              env: [for v in parameter.env {
                name:  v.name
                value: v.value
              }]
              envFrom: [for v in parameter.env if v.required == true {
                secretRef: name: v.name
              }]
            }
            if parameter["ports"] != _|_ {
              ports: [for v in parameter.ports {
                containerPort: v.port
                if v.name != _|_ { name: v.name }
              }]
            }
          }]
          volumes: [for v in parameter.volumes {
            name:     v.name
            emptyDir: {}
          }]
          if parameter["serviceAccountName"] != _|_ {
            serviceAccountName: parameter.serviceAccountName
          }
          if parameter["tolerations"] != _|_ {
            tolerations: [for t in parameter.tolerations {
              key:      t.key
              effect:   t.effect
              operator: "Exists"
            }]
          }
        }
      }
      if parameter.requireAffinity {
        template: spec: affinity: nodeAffinity: {
          requiredDuringSchedulingIgnoredDuringExecution: nodeSelectorTerms: [{
            matchExpressions: [{
              key:      "kubernetes.io/os"
              operator: "In"
              values:   ["linux"]
            }]
          }]
        }
      }
    }
  }
  outputs: {
    hpa: {
      apiVersion: {
        if context.clusterVersion.minor < 23 { "autoscaling/v2beta2" }
        if context.clusterVersion.minor >= 23 { "autoscaling/v2" }
      }
      kind: "HorizontalPodAutoscaler"
      metadata: name: context.name
      spec: {
        scaleTargetRef: {
          apiVersion: "apps/v1"
          kind:       "Deployment"
          name:       context.name
        }
        minReplicas: parameter.minReplicas
        maxReplicas: parameter.maxReplicas
        metrics: [
          {
            type: "Resource"
            resource: {
              name: "cpu"
              target: {
                type:               "Utilization"
                averageUtilization: 80
              }
            }
          },
          if parameter["memory"] != _|_ {
            type: "Resource"
            resource: {
              name: "memory"
              target: {
                type:               "Utilization"
                averageUtilization: 70
              }
            }
          },
          if parameter["customMetrics"] != _|_ for m in parameter.customMetrics {
            type: "Pods"
            pods: {
              metric: name: m.name
              target: {
                type:         "AverageValue"
                averageValue: m.value
              }
            }
          },
        ]
      }
    }
    if parameter["ports"] != _|_ {
      service: {
        apiVersion: "v1"
        kind:       "Service"
        metadata: name: context.name
        spec: {
          selector: "app.oam.dev/component": context.name
          ports: [
            if parameter["ports"] != _|_ for v in parameter.ports if v.expose == true {
              port:       v.port
              targetPort: v.port
              if v.name != _|_ { name: v.name }
            },
          ]
        }
      }
    }
    if parameter["serviceAccountName"] != _|_ {
      serviceaccount: {
        apiVersion: "v1"
        kind:       "ServiceAccount"
        metadata: name: parameter.serviceAccountName
      }
    }
  }
  parameter: {
    // +usage=Container image
    image: string
    replicas: *1 | int
    cpu?:    string
    memory?: string
    labels?: [string]: string
    annotations?: [string]: string
    // +usage=Pod volumes
    volumes: [..._]
    extraVolumeMounts: [..._]
    customMetrics?: [..._]
    minReplicas: *1 | int
    maxReplicas: *10 | int
    env?:                [..._]
    ports?:              [..._]
    tolerations?:        [..._]
    requireAffinity:     *false | bool
    serviceAccountName?: string
  }
}
```

</TabItem>
</Tabs>

Reproduce the CUE on the right with:

```shell
vela def validate-module ./my-platform
vela def gen-module ./my-platform -o ./generated-cue
```

## Related

- [ComponentDefinition](./definition-component.md) — define workload types
- [Helper Builder](./template-helper-builder.md) — `tpl.Helper()` and let-bindings
- [ForEachWith / ItemBuilder](./foreach-item-builder.md) — per-element builder pattern
