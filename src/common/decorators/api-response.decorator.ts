import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { applyDecorators } from '@nestjs/common';

type ClassConstructor = new (...args: unknown[]) => unknown;

interface APIResponseType {
  status: number;
  description: string;
  type?: ClassConstructor | string;
}

interface APIQueryParam {
  name: string;
  required: boolean;
  description: string;
  type: ClassConstructor | string;
}

/**
 * Decorator function for defining API responses for swagger documentation.
 *
 * @param responses - An array of API response types.
 * @param invalidKey - The key used to describe an invalid response.
 * @param notFoundKey - The key used to describe a not found response.
 * @returns A decorator function that applies the specified API responses.
 */
export function APIResponsesDecorator(
  responses: APIResponseType[],
  invalidKey?: string,
  notFoundKey?: string,
) {
  const commonResponses = [
    ApiForbiddenResponse({
      description: 'Forbidden | Missing API_KEY or Authorization ',
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
    }),
  ];

  if (invalidKey) {
    commonResponses.push(
      ApiBadRequestResponse({ description: `Invalid ${invalidKey}` }),
    );
  }

  if (notFoundKey) {
    commonResponses.push(
      ApiNotFoundResponse({ description: `${notFoundKey} not found` }),
    );
  }

  return applyDecorators(
    ...[...commonResponses, ...responses.map((res) => ApiResponse(res))],
  );
}

const commonResponses = [
  ApiUnauthorizedResponse({
    description: 'Unauthorized | Invalid API_KEY or Authorization',
  }),
  ApiForbiddenResponse({
    description: 'Forbidden | Missing API_KEY or Authorization ',
  }),
  ApiConflictResponse({
    description: 'Conflict | Entry already exists',
  }),
  ApiUnprocessableEntityResponse({
    description: 'Unprocessable Entity | Invalid input data',
  }),
  ApiInternalServerErrorResponse({
    description: 'Internal server error',
  }),
];

/**
 * Decorator function for specifying the responses for an API POST request.
 * @param responses An array of {APIResponseType} objects representing the possible responses.
 * @returns A decorator function that applies the specified responses to the decorated endpoint.
 */
export function APICreateResponsesDecorator(responses: APIResponseType[]) {
  return applyDecorators(
    ...[...commonResponses, ...responses.map((r) => ApiResponse(r))],
  );
}

/**
 * Decorator function for defining API responses for getting a list of items.
 * Items returned are paginated.
 *
 * @param modelName - The name of the model.
 * @param dto - The data transfer object for the model.
 * @returns A decorator function that applies the defined API responses.
 */
export function APIGetItemsResponsesDecorator(
  modelName: string,
  dto: ClassConstructor | string,
) {
  return applyDecorators(
    ...[
      ApiOkResponse({
        description: `Returns a list of ${modelName}`,
        type: dto,
      }),
      ...commonResponses,
    ],
  );
}

/**
 * Decorator function for generating API query parameters.
 *
 * @param params - An array of APIQueryParam objects representing the query parameters.
 * @returns A decorator function that applies the ApiQuery decorator to each parameter.
 */
export function APIQueryParamsDecorator(params: APIQueryParam[]) {
  return applyDecorators(
    ...params.map((param) => {
      return ApiQuery({
        name: param.name,
        required: param.required,
        description: param.description,
        type: param.type,
      });
    }),
  );
}
