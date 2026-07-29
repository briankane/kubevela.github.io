---
title: Complex Parameter Types
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Complex parameter types compose multiple fields or variant shapes into a single parameter. Use `Struct` when you need a named top-level sub-object with a typed, fixed set of fields (and access via `.Field()` refs in templates); `Object` as the fluent alias for the same concept when building nested configs; `OneOf` with `Variant` for discriminated unions where a selector field determines which set of sibling fields is active; `ClosedUnion` with `ClosedStruct` when the union shape must be fully closed (no extra fields permitted) and there is no single discriminator key; `Field` with `ParamType*` constants to declare typed fields inside `Struct.WithFields()` programmatically. All these types participate in the standard parameter chain (`Required()`, `Optional()`, `Description()`) and integrate with `SetIf` conditions through `.IsSet()`, `.Eq()`, and `.Field()` field references.

## `defkit.Struct()` and `defkit.Field()`

| Method | Description |
|---|---|
| `defkit.Struct(name string) *StructParam` | Creates a named struct parameter with typed, fixed fields. Generates a nested CUE struct `name?: { ... }`. Chain `.WithFields(...)` to declare each field. |
| `*StructParam.WithFields(fields ...*StructField) *StructParam` | Adds field definitions to the struct. Fields are created with `defkit.Field(name, paramType)` and its modifier chain. |
| `*StructParam.Required() *StructParam` | Marks the struct as required (`name!:`). |
| `*StructParam.Optional() *StructParam` | Marks the struct as optional (`name?:`). Without either modifier, the parameter is required by default. |
| `*StructParam.Description(desc string) *StructParam` | Sets the usage comment shown in `vela show`. Generates `// +usage=desc`. |
| `*StructParam.WithSchemaRef(ref string) *StructParam` | References an external CUE type definition instead of inline fields (e.g. `"#ResourceSpec"`). The helper must be declared separately via `tpl.Helper()`. |
| `*StructParam.Field(fieldPath string) *ParamFieldRef` | Returns a reference to a nested field within this struct for use in `.Set()` / `.SetIf()` value positions (e.g. `resources.Field("cpu")` → `parameter.resources.cpu`). |

### `defkit.Field()` and `StructField` methods

| Method | Description |
|---|---|
| `defkit.Field(name string, fieldType ParamType) *StructField` | Creates a typed field for use inside `Struct.WithFields()`. `fieldType` is one of the `ParamType*` constants. |
| `*StructField.Required() *StructField` | Marks the field as required (`field!: type`). |
| `*StructField.Optional() *StructField` | Marks the field as optional (`field?: type`). |
| `*StructField.Default(value any) *StructField` | Sets a default value. Generates `field: *value \| type`. |
| `*StructField.Description(desc string) *StructField` | Sets the field's usage comment. |
| `*StructField.Values(values ...string) *StructField` | Restricts a string field to a fixed enum. Generates `field: "a" \| "b"`. |
| `*StructField.Of(elemType ParamType) *StructField` | Sets the element type when this field holds an array (`[...string]`, `[...int]`, etc.). |
| `*StructField.Nested(s *StructParam) *StructField` | Makes the field's type a nested struct, creating hierarchical schemas. |
| `*StructField.WithSchemaRef(ref string) *StructField` | References an external CUE type definition for this field. |

### `ParamType*` constants

| Constant | CUE type |
|---|---|
| `defkit.ParamTypeString` | `string` |
| `defkit.ParamTypeInt` | `int` |
| `defkit.ParamTypeBool` | `bool` |
| `defkit.ParamTypeFloat` | `float` |

## `defkit.Object()`

`defkit.Object(name string) *MapParam` is a convenience alias for `defkit.Map(name)`. It is documented separately because it reads more naturally when representing a config object with a known, closed set of named fields. Use it in place of `Map` when the intent is a structured sub-object rather than a dictionary. It supports the full `MapParam` chain: `.WithFields(...)`, `.Of(valueType)`, `.WithSchema(schema)`, `.WithSchemaRef(ref)`, `.Field(fieldPath)`, `.Required()`, `.Optional()`, `.Description()`, condition methods (`.IsSet()`, `.IsNotEmpty()`, `.HasKey()`, `.LenEq()`, `.LenGt()`, `.IsEmpty()`).

:::tip
`Object` and `Struct` both generate nested CUE structs, but their field-declaration APIs differ. `Object.WithFields(...)` accepts `Param` constructors (`defkit.String(...)`, `defkit.Int(...)`, etc.) while `Struct.WithFields(...)` accepts `*StructField` values created with `defkit.Field(name, paramType)`. Use `Struct` when you need the full `StructField` modifier set (`Values`, `Of`, `Nested`, `WithSchemaRef`). Use `Object` when you want to reuse the scalar param constructors you already know.
:::

## `defkit.OneOf()` and `defkit.Variant()`

| Method | Description |
|---|---|
| `defkit.OneOf(name string) *OneOfParam` | Creates a discriminated union parameter. The parameter itself becomes the enum selector field. Generates `name?: "variantA" \| "variantB"` plus `if name == "variantA" { ... }` blocks for each variant's fields at the same schema level. |
| `*OneOfParam.Variants(variants ...*OneOfVariant) *OneOfParam` | Adds variant definitions. Each variant is built with `defkit.Variant(name).WithFields(...)`. |
| `*OneOfParam.Discriminator(field string) *OneOfParam` | Names the field used to distinguish variants. This is for tooling and metadata only; it does not change the generated CUE — the param name is always used as the enum field name. |
| `*OneOfParam.Default(value string) *OneOfParam` | Sets the default variant name. Generates `name: *"variantA" \| "variantB"`. |
| `*OneOfParam.Required() *OneOfParam` | Marks the union as required. |
| `*OneOfParam.Optional() *OneOfParam` | Marks the union as optional. |
| `*OneOfParam.Description(desc string) *OneOfParam` | Sets the usage comment. |
| `defkit.Variant(name string) *OneOfVariant` | Starts a variant definition. Chain `.WithFields(...)` to declare the fields exposed when this variant is selected. |
| `*OneOfVariant.WithFields(fields ...*StructField) *OneOfVariant` | Declares the fields active when this variant is selected. Uses the same `*StructField` API as `Struct.WithFields()`. |

## `defkit.ClosedUnion()` and `defkit.ClosedStruct()`

| Method | Description |
|---|---|
| `defkit.ClosedUnion(name string) *ClosedUnionParam` | Creates a closed struct disjunction. Generates `name?: close({...}) \| close({...})`. Use when there is no single discriminator key and the parameter must match exactly one of several fully-closed shapes. |
| `*ClosedUnionParam.Options(options ...*ClosedStructOption) *ClosedUnionParam` | Adds closed-struct alternatives. Each option is built with `defkit.ClosedStruct().WithFields(...)`. |
| `*ClosedUnionParam.Required() *ClosedUnionParam` | Marks the union as required. |
| `*ClosedUnionParam.Optional() *ClosedUnionParam` | Marks the union as optional. |
| `*ClosedUnionParam.Description(desc string) *ClosedUnionParam` | Sets the usage comment. |
| `defkit.ClosedStruct() *ClosedStructOption` | Creates one option in a closed disjunction. Chain `.WithFields(...)` to add fields. Extra fields not listed here are rejected by CUE. |
| `*ClosedStructOption.WithFields(fields ...*StructField) *ClosedStructOption` | Adds fields to this closed struct option. Uses the same `*StructField` API. |

:::caution
`OneOf` and `ClosedUnion` solve different modelling problems. `OneOf` requires a distinguishing enum value (the param itself) that selects which sibling fields appear — good for mutually exclusive modes (`"pvc"` vs `"emptyDir"`). `ClosedUnion` generates a CUE disjunction of fully-closed structs where CUE itself infers which alternative matches — good for shape-based unions where no single discriminator key is practical (e.g. `ClusterIP` vs `NodePort` service specs whose distinguishing field is also a data field).
:::

## Example

The `complex-types-demo` component exercises all four complex-type constructors in a single definition: `Struct("resources").WithFields(Field("cpu", ParamTypeString), Field("memory", ParamTypeString), Field("gpu", ParamTypeInt))` — demonstrating `Field`, `Default`, `Optional`, and the `ParamType*` constants; `Object("config").WithFields(String("logLevel"), String("outputFormat"))` — showing `Object` with scalar param constructors and `.Field()` ref access in the template; `OneOf("storage").Variants(Variant("emptyDir"), Variant("pvc"))` — generating the enum selector plus conditional sibling fields; and `ClosedUnion("endpoint").Options(ClosedStruct().WithFields(...), ClosedStruct().WithFields(...))` — emitting a closed struct disjunction. Building on the `my-platform` module scaffolded in [Quick Start](./quick-start.md), drop the file below into `my-platform/components/`.

<Tabs groupId="defkit-example">
<TabItem value="go" label="Go — defkit">

```go
package components

import "github.com/oam-dev/kubevela/pkg/definition/defkit"

func ComplexTypesDemo() *defkit.ComponentDefinition {
    resources := defkit.Struct("resources").
        Optional().
        Description("CPU and memory requirements for the container").
        WithFields(
            defkit.Field("cpu", defkit.ParamTypeString).Default("100m"),
            defkit.Field("memory", defkit.ParamTypeString).Default("128Mi"),
            defkit.Field("gpu", defkit.ParamTypeInt).Optional(),
        )

    config := defkit.Object("config").
        Optional().
        Description("Application configuration").
        WithFields(
            defkit.String("logLevel").Default("info"),
            defkit.String("outputFormat").Optional(),
        )

    storage := defkit.OneOf("storage").
        Optional().
        Description("Storage backend for the workload").
        Variants(
            defkit.Variant("emptyDir").WithFields(
                defkit.Field("sizeLimit", defkit.ParamTypeString).Optional(),
            ),
            defkit.Variant("pvc").WithFields(
                defkit.Field("size", defkit.ParamTypeString),
                defkit.Field("storageClass", defkit.ParamTypeString).Default("standard"),
            ),
        )

    endpoint := defkit.ClosedUnion("endpoint").
        Optional().
        Description("Endpoint exposure mode: either a ClusterIP or a NodePort").
        Options(
            defkit.ClosedStruct().WithFields(
                defkit.Field("type", defkit.ParamTypeString).Default("ClusterIP"),
                defkit.Field("port", defkit.ParamTypeInt),
            ),
            defkit.ClosedStruct().WithFields(
                defkit.Field("type", defkit.ParamTypeString).Default("NodePort"),
                defkit.Field("port", defkit.ParamTypeInt),
                defkit.Field("nodePort", defkit.ParamTypeInt).Optional(),
            ),
        )

    return defkit.NewComponent("complex-types-demo").
        Description("Demonstrates Struct, Object, OneOf/Variant, ClosedUnion/ClosedStruct, and Field/ParamType constants").
        Workload("apps/v1", "Deployment").
        Params(resources, config, storage, endpoint).
        Template(complexTypesDemoTemplate)
}

func complexTypesDemoTemplate(tpl *defkit.Template) {
    vela := defkit.VelaCtx()

    resources := defkit.Struct("resources").WithFields(
        defkit.Field("cpu", defkit.ParamTypeString),
        defkit.Field("memory", defkit.ParamTypeString),
        defkit.Field("gpu", defkit.ParamTypeInt).Optional(),
    )
    config := defkit.Object("config").WithFields(
        defkit.String("logLevel"),
        defkit.String("outputFormat").Optional(),
    )
    storage := defkit.OneOf("storage")

    dep := defkit.NewResource("apps/v1", "Deployment").
        Set("metadata.name", vela.Name()).
        Set("spec.selector.matchLabels[app.oam.dev/component]", vela.Name()).
        Set("spec.template.metadata.labels[app.oam.dev/component]", vela.Name()).
        Set("spec.template.spec.containers[0].name", vela.Name()).
        Set("spec.template.spec.containers[0].image", defkit.Lit("nginx:stable")).
        SetIf(resources.IsSet(), "spec.template.spec.containers[0].resources.requests.cpu",
            resources.Field("cpu")).
        SetIf(resources.IsSet(), "spec.template.spec.containers[0].resources.requests.memory",
            resources.Field("memory")).
        SetIf(config.IsSet(), "spec.template.metadata.labels[log-level]",
            config.Field("logLevel")).
        SetIf(storage.IsSet(), "spec.template.metadata.labels[storage-type]",
            storage)

    tpl.Output(dep)
}

func init() { defkit.Register(ComplexTypesDemo()) }
```

</TabItem>
<TabItem value="cue" label="CUE — generated">

```cue
"complex-types-demo": {
  type: "component"
  annotations: {}
  labels: {}
  description: "Demonstrates Struct, Object, OneOf/Variant, ClosedUnion/ClosedStruct, and Field/ParamType constants"
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
    metadata: name: context.name
    spec: {
      selector: matchLabels: "app.oam.dev/component": context.name
      template: {
        metadata: labels: {
          "app.oam.dev/component": context.name
          if parameter["config"] != _|_ {
            "log-level": parameter.config.logLevel
          }
          if parameter["storage"] != _|_ {
            "storage-type": parameter.storage
          }
        }
        spec: containers: [{
          name:  context.name
          image: "nginx:stable"
          if parameter["resources"] != _|_ {
            resources: requests: {
              cpu:    parameter.resources.cpu
              memory: parameter.resources.memory
            }
          }
        }]
      }
    }
  }
  parameter: {
    // +usage=CPU and memory requirements for the container
    resources?: {
      cpu:    *"100m" | string
      memory: *"128Mi" | string
      gpu?:   int
    }
    // +usage=Application configuration
    config?: {
      logLevel:      *"info" | string
      outputFormat?: string
    }
    // +usage=Storage backend for the workload
    storage?: "emptyDir" | "pvc"
    if storage == "emptyDir" {
      sizeLimit?: string
    }
    if storage == "pvc" {
      size:         string
      storageClass: *"standard" | string
    }

    // +usage=Endpoint exposure mode: either a ClusterIP or a NodePort
    endpoint?: close({
      type: *"ClusterIP" | string
      port: int
    }) | close({
      type:      *"NodePort" | string
      port:      int
      nodePort?: int
    })
  }
}
```

</TabItem>
<TabItem value="application" label="Application YAML">

```yaml title="complex-types-app.yaml"
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: complex-types-app
  namespace: default
spec:
  components:
    - name: complex-types
      type: complex-types-demo
      properties:
        resources:
          cpu: "250m"
          memory: "256Mi"
        config:
          logLevel: debug
          outputFormat: json
        storage: pvc
        size: "10Gi"
        storageClass: standard
        endpoint:
          type: ClusterIP
          port: 8080
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
vela def apply ./generated-cue/components/complex-types-demo.cue
vela up -f complex-types-app.yaml
vela status complex-types-app --namespace default
```

```
About:

  Name:         complex-types-app
  Namespace:    default
  Healthy:      true
  Details:      running

Services:

  - Name: complex-types
    Cluster: local
    Namespace: default
    Type: complex-types-demo
    Health: true
    No trait applied
```

Once the Application reaches `running`, inspect the rendered Deployment to confirm that `resources`, `config`, and `storage` landed correctly. `endpoint` is a schema-only demonstration here — see the note after the captured output. Output below was captured live against a k3d cluster:

```shell
$ kubectl get deployment complex-types -n default \
    -o jsonpath='{.spec.template.spec.containers[0].resources}' \
  | python3 -m json.tool
{
    "requests": {
        "cpu": "250m",
        "memory": "256Mi"
    }
}

$ kubectl get deployment complex-types -n default \
    -o jsonpath='{.spec.template.metadata.labels}' \
  | python3 -m json.tool
{
    "app.oam.dev/component": "complex-types",
    "log-level": "debug",
    "storage-type": "pvc"
}

$ kubectl get deployment complex-types -n default \
    -o jsonpath='NAME={.metadata.name} READY={.status.readyReplicas}/{.status.replicas}'
NAME=complex-types READY=1/1
```

`resources.Field("cpu")` resolves to `parameter.resources.cpu` and lands `250m` in the container resource requests. `config.Field("logLevel")` resolves to `parameter.config.logLevel` and writes `log-level=debug` as a pod label. `storage: pvc` activates the `pvc` branch of the `OneOf` enum, making `size` and `storageClass` required and writing `storage-type=pvc` as a pod label via `storage.IsSet()`.

The `endpoint` `ClosedUnion` parameter is **schema-only** in this template. The Application's `endpoint: { type: ClusterIP, port: 8080 }` is validated against the closed disjunction (extra fields are rejected by CUE), but it is never consumed by `complexTypesDemoTemplate` and therefore does not appear on the rendered Deployment. This is by design of the fluent API: `ClosedUnionParam` exposes `Options/Required/Optional/Description` only — there is no `.Field()` accessor analogous to `Struct.Field()` / `Object.Field()`, because each option may declare a different field set. To consume an inner value from a template, drop into raw CUE with `defkit.Reference("parameter.endpoint.type")` (and remember that for the disjunction to resolve, each option must differ in at least one literal-valued field — `*"X" | string` defaults are too permissive to discriminate when the user supplies the field).

Clean up afterwards:

```shell
vela delete complex-types-app --namespace default --yes
kubectl delete componentdefinition complex-types-demo -n vela-system
```

## Related

- [ComponentDefinition](./definition-component.md) — define workload types
- [Collection Parameter Types](./param-collection-types.md) — `StringList`, `Array`, `Map`, `DynamicMap`
- [Resource Builder](./resource-builder.md) — `NewResource`, `Set`, `SetIf`, array builders
- [Value Expressions](./value-expressions.md) — `Lit`, `Reference`, `ParamRef`, comparison and logical operators
