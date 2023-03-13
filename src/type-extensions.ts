import { FactoryType } from "locklift/internal/factory";
import { DeploymentHandler } from "./handler";

export const PLUGIN_NAME = "deployArtifacts" as const;

export type DeployArtifactsExtension<T extends FactoryType> = {
  [key in typeof PLUGIN_NAME]: DeploymentHandler<T>;
};
