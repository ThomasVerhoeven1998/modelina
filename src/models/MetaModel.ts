export interface MetaModelOptionsConst {
  originalInput: unknown;
}

export interface MetaModelOptionsDiscriminator {
  discriminator: string;
}

export class MetaModelOptions {
  const?: MetaModelOptionsConst;
  discriminator?: MetaModelOptionsDiscriminator;
  isNullable?: boolean = false;
  format?: string;
  extend?: MetaModel[];
  isExtended?: boolean;
}

export class MetaModel {
  constructor(
    public name: string,
    public originalInput: any,
    public options: MetaModelOptions
  ) {}
}

export class ReferenceModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public ref: MetaModel
  ) {
    super(name, originalInput, options);
  }
}
export class AnyModel extends MetaModel {}
export class FloatModel extends MetaModel {}
export class IntegerModel extends MetaModel {}
export class StringModel extends MetaModel {}
export class BooleanModel extends MetaModel {}
export class TupleValueModel {
  constructor(
    public index: number,
    public value: MetaModel
  ) {}
}
export class TupleModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public tuple: TupleValueModel[]
  ) {
    super(name, originalInput, options);
  }
}
export class ObjectPropertyModel {
  constructor(
    public propertyName: string,
    public required: boolean,
    public property: MetaModel
  ) {}
}
export class ObjectModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public properties: { [key: string]: ObjectPropertyModel }
  ) {
    super(name, originalInput, options);
  }
}
export class ArrayModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public valueModel: MetaModel
  ) {
    super(name, originalInput, options);
  }
}

export function findCommonProperties<T>(objectProperties: { [key: string]: T }[]): { [key: string]: T } {
  if (objectProperties.length === 0) {
    return {};
  }

  // TODO deepEqual a, b
  const ignoreOriginalInput = (key: string, value: any) => key === "originalInput" ? undefined : value;
  const isEqual = (a: ObjectPropertyModel, b: ObjectPropertyModel) => JSON.stringify(a, ignoreOriginalInput) === JSON.stringify(b, ignoreOriginalInput);

  const commonPropertyList = objectProperties.slice(1)
    .reduce((commonProperties, properties) => {
      return commonProperties
        .filter(([key]) => key in properties)
        .filter(([key]) => key !== "additionalProperties")
        .filter(([key, value]) => isEqual(properties[key], value));
    }, Object.entries(objectProperties[0]));
  return Object.fromEntries(commonPropertyList);
}

export class UnionModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public union: MetaModel[]
  ) {
    super(name, originalInput, options);
  }
  get properties(): { [key: string]: ObjectPropertyModel } {
    throw new Error("not allowed");
  }
  get commonProperties(): { [key: string]: ObjectPropertyModel } {
    const objectProperties = this.union
      .map(partModel => partModel instanceof ReferenceModel ? partModel.ref : partModel)
      .filter((partModel): partModel is ObjectModel => partModel instanceof ObjectModel)
      .map(partModel => partModel.properties);
    return findCommonProperties(objectProperties);
  }
}
export class EnumValueModel {
  constructor(
    public key: string,
    public value: any
  ) {}
}
export class EnumModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public values: EnumValueModel[]
  ) {
    super(name, originalInput, options);
  }
}
export class DictionaryModel extends MetaModel {
  constructor(
    name: string,
    originalInput: any,
    options: MetaModelOptions,
    public key: MetaModel,
    public value: MetaModel,
    public serializationType: 'unwrap' | 'normal' = 'normal'
  ) {
    super(name, originalInput, options);
  }
}
