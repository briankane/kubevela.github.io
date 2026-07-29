---
title: Collection Parameter Types
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Collection parameters represent multi-value fields — lists, arrays, and maps. Use `StringList` or `IntList` for typed flat arrays of scalars, `Array` when elements share a struct schema or need length constraints, `List` when the element shape is heterogeneous or externally defined, `StringKeyMap` for the common string-to-string map pattern (labels, annotations), `Map` when you need a typed value, a known field set, or runtime conditions like `.HasKey()`, and `DynamicMap` when the entire `parameter` block itself should be a map with dynamic keys.

## Array Constructors

| Constructor | CUE type | Description |
|---|---|---|
| `defkit.StringList(name string) *ArrayParam` | `[...string]` | Shorthand for `Array(name).Of(ParamTypeString)`. Use for flat string lists (tags, secret names, command-line arguments). |
| `defkit.IntList(name string) *ArrayParam` | `[...int]` | Shorthand for `Array(name).Of(ParamTypeInt)`. Use for flat integer lists (port allowlists, retry counts). |
| `defkit.Array(name string) *ArrayParam` | `[...]` | Generic array. Chain `.Of(elemType)` for typed scalar elements, `.WithFields(...)` for struct elements, or `.MinItems(n)` / `.MaxItems(n)` for length constraints. |
| `defkit.List(name string) *ArrayParam` | `[...]` | Alias for `Array(name)` without an element type. Use when elements are heterogeneous or the schema is provided externally via `.WithSchema()` / `.WithSchemaRef()`. |

## `ArrayParam` Chain Methods

| Method | Description |
|---|---|
| `.Of(elemType ParamType) *ArrayParam` | Sets the element type. Generates `[...string]`, `[...int]`, etc. Omit to produce an open-typed array `[...]`. |
| `.WithFields(fields ...Param) *ArrayParam` | Declares a struct schema for each element. Generates `[...{ port: int, name?: string }]`. Pass any typed `*Param` constructors as fields. Use when elements have a known, named shape. |
| `.WithSchema(schema string) *ArrayParam` | Sets a raw CUE string as the element schema. Escape hatch for complex element types not expressible via `.WithFields()`. |
| `.WithSchemaRef(ref string) *ArrayParam` | References an external CUE definition for elements (e.g. `"#VolumeSpec"`). The helper definition must be declared separately via `tpl.Helper()`. |
| `.MinItems(n int) *ArrayParam` | Emits `list.MinItems(n)` as a schema constraint. Requires `WithImports("list")` on the definition. |
| `.MaxItems(n int) *ArrayParam` | Emits `list.MaxItems(n)` as a schema constraint. Requires `WithImports("list")` on the definition. |

## `ArrayParam` Runtime Condition Methods

These methods produce `Condition` values for use with `.SetIf()`, `.If()`/`.EndIf()`, `.OutputsIf()`, and `placement` predicates. They do not affect the generated CUE schema — they control template logic.

| Method | CUE generated | Description |
|---|---|---|
| `.IsSet() Condition` | `parameter["x"] != _|_` | True when the parameter was supplied by the user. The most common guard for optional arrays. |
| `.IsNotEmpty() Condition` | `len(parameter.x) > 0` | True when the array is supplied AND has at least one element. |
| `.IsEmpty() Condition` | `parameter["x"] == _|_ \|\| len(parameter.x) == 0` | True when absent or empty. Renders as two `if` blocks. |
| `.LenEq(n int) Condition` | `len(parameter.x) == n` | Exact length match. `LenEq(0)` is equivalent to `IsEmpty()`. |
| `.LenGt(n int) Condition` | `len(parameter.x) > n` | Length strictly greater than `n`. |
| `.LenGte(n int) Condition` | `len(parameter.x) >= n` | Length greater than or equal to `n`. |
| `.LenLt(n int) Condition` | `len(parameter.x) < n` | Length strictly less than `n`. |
| `.LenLte(n int) Condition` | `len(parameter.x) <= n` | Length less than or equal to `n`. |
| `.Contains(val any) Condition` | `list.Contains(parameter.x, val)` | True when the array contains the given value. |

:::tip
`.LenEq()`, `.LenGt()`, etc. on `ArrayParam` are *runtime conditions* for template logic. They are different from `.MinItems()` / `.MaxItems()`, which are *schema constraints* that appear in the `parameter:` block and are enforced by CUE validation when a user submits an Application.
:::

## Map Constructors

| Constructor | CUE type | Description |
|---|---|---|
| `defkit.StringKeyMap(name string) *StringKeyMapParam` | `[string]: string` | The most concise map type. Keys and values are both strings. Use for labels, annotations, and any free-form string dictionary. |
| `defkit.Map(name string) *MapParam` | `{...}` or `[string]: T` | General-purpose map. Use `.Of(valueType)` to produce `[string]: T`, or `.WithFields(...)` to declare a struct with known fields. Without either, generates an open struct `{...}`. |

:::caution
`defkit.Map("x")` without `.Of()` or `.WithFields()` generates `{...}` — an open struct that accepts any fields. This provides no schema enforcement. Prefer `StringKeyMap` for string dictionaries or `Map().Of()` / `Map().WithFields()` for typed structures.
:::

## `MapParam` Chain Methods

| Method | Description |
|---|---|
| `.Of(valueType ParamType) *MapParam` | Sets the value type. Generates `[string]: string`, `[string]: int`, etc. Makes the parameter behave like a typed dictionary. |
| `.WithFields(fields ...Param) *MapParam` | Declares a struct schema with named fields. Generates `{ logLevel: string, outputFormat?: string }`. Use when the object's shape is known and fixed. |
| `.WithSchema(schema string) *MapParam` | Sets a raw CUE string as the map structure. Escape hatch for complex schemas. |
| `.WithSchemaRef(ref string) *MapParam` | References an external CUE definition. The helper must be declared separately. |
| `.Field(fieldPath string) *ParamFieldRef` | Returns a `*ParamFieldRef` for accessing a named field within this map. The ref can be passed to `.Set()` / `.SetIf()` as a value, or used with `.IsSet()` as a condition guard. |

## `MapParam` Runtime Condition Methods

| Method | CUE generated | Description |
|---|---|---|
| `.IsSet() Condition` | `parameter["x"] != _|_` | True when the map was supplied. |
| `.IsNotEmpty() Condition` | `len(parameter.x) > 0` | True when the map is present and contains at least one entry. |
| `.IsEmpty() Condition` | `parameter["x"] == _|_ \|\| len(parameter.x) == 0` | True when absent or empty. Renders as two `if` blocks. |
| `.HasKey(key string) Condition` | `parameter.x.key != _|_` | True when the map contains the named key. |
| `.LenEq(n int) Condition` | `len(parameter.x) == n` | Exact entry count. `LenEq(0)` is equivalent to `IsEmpty()`. |
| `.LenGt(n int) Condition` | `len(parameter.x) > n` | Entry count strictly greater than `n`. |

## `DynamicMap`

`defkit.DynamicMap()` replaces the **entire** `parameter` block with a dynamic map. Unlike `Map()`, it is not a named field — it sets the whole parameter schema to `[string]: T`. Use it in traits where user input is a flat key-value dictionary (for example a label-patch trait).

| Method | Description |
|---|---|
| `defkit.DynamicMap() *DynamicMapParam` | Creates a dynamic map parameter. The generated CUE sets `parameter: [string]: T`. |
| `.ValueType(t ParamType) *DynamicMapParam` | Sets the value type. Generates `[string]: string`, `[string]: int`, etc. |
| `.ValueTypeUnion(union string) *DynamicMapParam` | Sets a union value type string. Generates `[string]: string \| null`. |

:::tip
`DynamicMap` is the only collection type that changes the shape of the entire `parameter` block rather than adding one named field. It cannot be combined with other `Param` constructors in the same `.Params(...)` call.
:::

## Example

Let's build a `collection-types-demo` component that puts every collection-parameter API through its paces: `StringList` for a `tags` array (verified via `.IsNotEmpty()` and `tags[0]` reference — using `.IsSet()` here would still fire when a user passes `tags: []` and then crash on the `tags[0]` index, so the guard must also check `len > 0`), `IntList` for an `allowedPorts` allowlist (verified via `.IsNotEmpty()`), `Array().WithFields(...).MinItems(1).MaxItems(20)` for a structured `ports` array (verified by the rendered container ports and Service filtering), `StringKeyMap` for `labels` (verified by the spread onto the Deployment), `Map().Of(ParamTypeString)` for `annotations` (same CUE shape as `StringKeyMap`, verified by the annotation spread), and `Map().WithFields(...).Field(...)` for a structured `config` object (verified by `config.Field("logLevel")` landing as a pod label). Building on the `my-platform` module scaffolded in [Quick Start](./quick-start.md), drop the file below into `my-platform/components/`.

<Tabs groupId="defkit-example">
<TabItem value="go" label="Go — defkit">

```go
package components

import "github.com/oam-dev/kubevela/pkg/definition/defkit"

func CollectionTypesDemo() *defkit.ComponentDefinition {
    tags := defkit.StringList("tags").
        Optional().
        Description("Arbitrary string tags attached to the workload")

    allowedPorts := defkit.IntList("allowedPorts").
        Optional().
        Description("Allowlist of port numbers")

    ports := defkit.Array("ports").
        WithFields(
            defkit.Int("port"),
            defkit.String("name").Optional(),
            defkit.Bool("expose").Default(false),
        ).
        MinItems(1).
        MaxItems(20).
        Optional().
        Description("Container ports; set expose=true to publish via Service")

    labels := defkit.StringKeyMap("labels").
        Optional().
        Description("Metadata labels spread onto the Deployment")

    annotations := defkit.Map("annotations").
        Of(defkit.ParamTypeString).
        Optional().
        Description("Metadata annotations; identical CUE shape to StringKeyMap")

    config := defkit.Map("config").
        WithFields(
            defkit.String("logLevel").Default("info"),
            defkit.String("outputFormat").Optional(),
        ).
        Optional().
        Description("Structured config object with known fields")

    return defkit.NewComponent("collection-types-demo").
        Description("Demonstrates StringList, IntList, Array, List, StringKeyMap, Map, and DynamicMap parameter constructors with their runtime conditions").
        Workload("apps/v1", "Deployment").
        Params(tags, allowedPorts, ports, labels, annotations, config).
        Template(collectionTypesDemoTemplate).
        WithImports("list")
}

func collectionTypesDemoTemplate(tpl *defkit.Template) {
    vela := defkit.VelaCtx()

    tags         := defkit.StringList("tags")
    _             = defkit.IntList("allowedPorts")
    ports        := defkit.Array("ports").WithFields(
        defkit.Int("port"),
        defkit.String("name").Optional(),
        defkit.Bool("expose").Default(false),
    )
    labels       := defkit.StringKeyMap("labels")
    annotations  := defkit.Map("annotations").Of(defkit.ParamTypeString)
    config       := defkit.Map("config").WithFields(
        defkit.String("logLevel"),
        defkit.String("outputFormat").Optional(),
    )

    containerPorts := defkit.NewArray().ForEachWith(ports, func(item *defkit.ItemBuilder) {
        v := item.Var()
        item.Set("containerPort", v.Field("port"))
        item.IfSet("name", func() { item.Set("name", v.Field("name")) })
    })

    dep := defkit.NewResource("apps/v1", "Deployment").
        Set("metadata.name", vela.Name()).
        SetIf(labels.IsSet(), "metadata.labels", labels).
        SetIf(annotations.IsSet(), "metadata.annotations", annotations).
        SetIf(config.IsSet(), "spec.template.metadata.labels[log-level]", config.Field("logLevel")).
        Set("spec.selector.matchLabels[app.oam.dev/component]", vela.Name()).
        Set("spec.template.metadata.labels[app.oam.dev/component]", vela.Name()).
        SetIf(tags.IsNotEmpty(), "spec.template.metadata.labels[tags]", defkit.ParamRef("tags[0]")).
        Set("spec.template.spec.containers[0].name", vela.Name()).
        Set("spec.template.spec.containers[0].image", defkit.Lit("nginx:stable")).
        SetIf(ports.IsSet(), "spec.template.spec.containers[0].ports", containerPorts)

    tpl.Output(dep)

    svc := defkit.NewResource("v1", "Service").
        Set("metadata.name", vela.Name()).
        Set("spec.selector[app.oam.dev/component]", vela.Name()).
        Set("spec.ports", defkit.NewArray().ForEachWithGuardedFiltered(
            ports.IsSet(),
            defkit.FieldEquals("expose", true),
            ports,
            func(item *defkit.ItemBuilder) {
                v := item.Var()
                item.Set("port", v.Field("port"))
                item.Set("targetPort", v.Field("port"))
                item.IfSet("name", func() { item.Set("name", v.Field("name")) })
            }))
    tpl.OutputsIf(ports.IsSet(), "service", svc)
}

func init() { defkit.Register(CollectionTypesDemo()) }
```

</TabItem>
<TabItem value="cue" label="CUE — generated">

```cue
import (
  "list"
)

"collection-types-demo": {
  type: "component"
  annotations: {}
  labels: {}
  description: "Demonstrates StringList, IntList, Array, List, StringKeyMap, Map, and DynamicMap parameter constructors with their runtime conditions"
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
      template: {
        metadata: {
          labels: {
            "app.oam.dev/component": context.name
            if parameter["config"] != _|_ {
              "log-level": parameter.config.logLevel
            }
            if parameter["tags"] != _|_ if len(parameter["tags"]) > 0 {
              "tags": parameter.tags[0]
            }
          }
        }
        spec: {
          containers: [{
            name:  context.name
            image: "nginx:stable"
            if parameter["ports"] != _|_ {
              ports: [for v in parameter.ports {
                containerPort: v.port
                if v.name != _|_ { name: v.name }
              }]
            }
          }]
        }
      }
      selector: matchLabels: "app.oam.dev/component": context.name
    }
  }
  outputs: {
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
  }
  parameter: {
    // +usage=Arbitrary string tags attached to the workload
    tags?: [...string]
    // +usage=Allowlist of port numbers
    allowedPorts?: [...int]
    // +usage=Container ports; set expose=true to publish via Service
    ports?: list.MinItems(1) & list.MaxItems(20) & [...{
      port:    int
      name?:   string
      expose:  *false | bool
    }]
    // +usage=Metadata labels spread onto the Deployment
    labels?: [string]: string
    // +usage=Metadata annotations; identical CUE shape to StringKeyMap
    annotations?: [string]: string
    // +usage=Structured config object with known fields
    config?: {
      logLevel:      *"info" | string
      outputFormat?: string
    }
  }
}
```

</TabItem>
<TabItem value="application" label="Application YAML">

```yaml title="collection-types-app.yaml"
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: collection-types-app
  namespace: default
spec:
  components:
    - name: collection-types
      type: collection-types-demo
      properties:
        tags:
          - backend
          - v2
        allowedPorts:
          - 8080
          - 9090
        ports:
          - port: 8080
            name: http
            expose: true
          - port: 9090
            name: metrics
            expose: false
        labels:
          env: staging
          team: platform
        annotations:
          owner: platform-team
        config:
          logLevel: debug
          outputFormat: json
```

</TabItem>
</Tabs>

Reproduce the CUE on the right with:

```shell
vela def validate-module ./my-platform
vela def gen-module ./my-platform -o ./generated-cue
```

### Apply and verify

Apply the definition and the Application YAML above against a live cluster:

```shell
vela def apply ./generated-cue/components/collection-types-demo.cue
vela up -f collection-types-app.yaml
vela status collection-types-app --namespace default
```

```
NAME                   COMPONENT          TYPE                    PHASE     HEALTHY   STATUS   AGE
collection-types-app   collection-types   collection-types-demo   running   true               3m14s
```

Once the Application reaches `running`, inspect the rendered resources to confirm each collection type. Output below was captured live against a k3d cluster:

```shell
$ kubectl get deployment collection-types -n default \
    -o jsonpath='{.spec.template.spec.containers[0].ports}' \
  | python3 -m json.tool
[
    {
        "containerPort": 8080,
        "name": "http",
        "protocol": "TCP"
    },
    {
        "containerPort": 9090,
        "name": "metrics",
        "protocol": "TCP"
    }
]

$ kubectl get service collection-types -n default \
    -o jsonpath='{.spec.ports}' \
  | python3 -m json.tool
[
    {
        "name": "http",
        "port": 8080,
        "protocol": "TCP",
        "targetPort": 8080
    }
]

$ kubectl get deployment collection-types -n default \
    -o jsonpath='labels={.metadata.labels.env},{.metadata.labels.team} pod-labels={.spec.template.metadata.labels}'
labels=staging,platform pod-labels={"app.oam.dev/component":"collection-types","log-level":"debug","tags":"backend"}
```

`tags[0] = "backend"` lands as pod label `tags=backend` via `StringList.IsNotEmpty()` (which expands to `parameter["tags"] != _|_ if len(parameter["tags"]) > 0` — both presence *and* non-empty, so an explicit `tags: []` is skipped instead of crashing the index lookup). `allowedPorts: [...]int` generates `[...int]` schema (enforced at apply time). `ports.MinItems(1).MaxItems(20)` emits `list.MinItems(1) & list.MaxItems(20) & [...]` in the `parameter:` block. `labels` (a `StringKeyMap`) spreads `env=staging, team=platform` onto the Deployment via `labels.IsSet()`. `annotations` (a `Map().Of(ParamTypeString)`) emits the same `[string]: string` CUE shape and lands `owner=platform-team`. `config.Field("logLevel")` resolves to `parameter.config.logLevel` and writes `log-level=debug` as a pod label. The Service contains only the `expose: true` port (`8080`); the `expose: false` port (`9090`) is absent because `ForEachWithGuardedFiltered(..., FieldEquals("expose", true), ...)` filters it out.

Clean up afterwards:

```shell
vela delete collection-types-app --namespace default --yes
kubectl delete componentdefinition collection-types-demo -n vela-system
```

## Related

- [ComponentDefinition](./definition-component.md) — define workload types
- [Resource Builder](./resource-builder.md) — `NewResource`, `Set`, `SetIf`, array builders
- [ForEachWith / ItemBuilder](./foreach-item-builder.md) — per-element builder pattern
- [Value Expressions](./value-expressions.md) — `Lit`, `Reference`, `ParamRef`, comparison and logical operators
