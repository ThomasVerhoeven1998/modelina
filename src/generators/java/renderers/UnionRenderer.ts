import { JavaRenderer } from '../JavaRenderer';
import {
  ConstrainedUnionModel,
  ConstrainedObjectPropertyModel, ConstrainedReferenceModel, ConstrainedObjectModel
} from "../../../models";
import { JavaOptions } from '../JavaGenerator';
import { UnionPresetType } from '../JavaPreset';
import { FormatHelpers } from '../../../helpers';

/**
 * Renderer for Java's `union` type
 *
 * @extends JavaRenderer
 */
export class UnionRenderer extends JavaRenderer<ConstrainedUnionModel> {
  async defaultSelf(): Promise<string> {
    const doc = this.renderComments(
      `${this.model.name} represents a union of types: ${this.model.union
        .map((m) => m.type)
        .join(', ')}`
    );

    const content = [];

    if (this.model.options.discriminator) {
      content.push(await this.runDiscriminatorGetterPreset());
    }
    content.push(await this.runAdditionalContentPreset());
    content.push(await this.renderAccessors());

    return this.renderBlock([
      doc,
      `public interface ${this.model.name} {`,
      this.indent(this.renderBlock(content)),
      '}'
    ]);
  }

  runDiscriminatorGetterPreset(): Promise<string> {
    return this.runPreset('discriminatorGetter');
  }

  /**
   * Render all the accessors for the properties
   */
  async renderAccessors(): Promise<string> {
    const properties = getCommonUnionProperties(this.model) || {};
    const content: string[] = [];

    for (const property of Object.values(properties)) {
      const getter = await this.runGetterPreset(property);
      const setter = await this.runSetterPreset(property);
      content.push(this.renderBlock([getter, setter]));
    }

    return this.renderBlock(content, 2);
  }

  runGetterPreset(property: ConstrainedObjectPropertyModel): Promise<string> {
    return this.runPreset('getter', { property });
  }

  runSetterPreset(property: ConstrainedObjectPropertyModel): Promise<string> {
    return this.runPreset('setter', { property });
  }
}

export function getCommonUnionProperties(model: ConstrainedUnionModel): { [key: string]: ConstrainedObjectPropertyModel } {
  const objectProperties = model.union
    .map(partModel => partModel instanceof ConstrainedReferenceModel ? partModel.ref : partModel)
    .filter((partModel): partModel is ConstrainedObjectModel => partModel instanceof ConstrainedObjectModel)
    .map(partModel => partModel.properties);
  if (objectProperties.length === 0) {
    return {};
  }

  const ignoreOriginalInput = (key: string, value: any) => key === "originalInput" ? undefined : value;
  // TODO nicer deepEqual?
  const isEqual = <T>(a: T, b: T) => JSON.stringify(a, ignoreOriginalInput) === JSON.stringify(b, ignoreOriginalInput);

  const commonPropertyList = objectProperties.slice(1)
    .reduce((commonProperties, properties) => {
      return commonProperties
        .filter(([key]) => key in properties)
        .filter(([key]) => key !== "additionalProperties")
        .filter(([key, value]) => isEqual(properties[key], value));
    }, Object.entries(objectProperties[0]));

  return Object.fromEntries(commonPropertyList);
}

const getterName = (sanitizedName: string, options: JavaOptions): string => {
  return options.modelType === 'record'
    ? FormatHelpers.toCamelCase(sanitizedName)
    : `get${FormatHelpers.toPascalCase(sanitizedName)}`;
};

export const JAVA_DEFAULT_UNION_PRESET: UnionPresetType<JavaOptions> = {
  self({ renderer }) {
    return renderer.defaultSelf();
  },
  discriminatorGetter({ model, options }) {
    if (!model.options.discriminator?.type) {
      return '';
    }

    return `${model.options.discriminator.type} ${getterName(
      getSanitizedDiscriminatorName(model),
      options
    )}();`;
  },
  getter({ property, model, options }) {
    if (
      property.unconstrainedPropertyName ===
      model.options.discriminator?.discriminator
    ) {
      return '';
    }
    return `${property.property.type} ${getterName(
      property.propertyName,
      options
    )}();`;
  },
  setter({ property, model, options }) {
    if (
      property.unconstrainedPropertyName ===
      model.options.discriminator?.discriminator
    ) {
      return '';
    }
    if (options.modelType === 'record') {
      return '';
    }
    const setterName = FormatHelpers.toPascalCase(property.propertyName);

    return `void set${setterName}(${property.property.type} ${property.propertyName});`;
  }
};

function getSanitizedDiscriminatorName(model: ConstrainedUnionModel): string {
  return FormatHelpers.replaceSpecialCharacters(
    model.options.discriminator!.discriminator,
    {
      exclude: [' ', '_'],
      separator: '_'
    }
  );
}
