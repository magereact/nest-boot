// eslint-disable-next-line max-classes-per-file
import { Type } from "@nestjs/common";
import { Field, Int, ObjectType } from "@nestjs/graphql";

import { PageInfo } from "../dtos";
import { ConnectionInterface, EdgeInterface } from "../interfaces";

export function createConnection<T>(
  NodeType: Type<T>
): Type<ConnectionInterface<T>> {
  const name = NodeType.name;

  @ObjectType(`${name}Edge`)
  class Edge implements EdgeInterface<T> {
    @Field(() => NodeType)
    node!: T;

    @Field()
    cursor!: string;
  }

  @ObjectType({ isAbstract: true })
  class AbstractConnection implements ConnectionInterface<T> {
    @Field(() => [Edge], { nullable: true })
    edges!: Edge[];

    @Field(() => [NodeType], { nullable: true })
    nodes!: T[];

    @Field()
    pageInfo!: PageInfo;

    @Field(() => Int, { nullable: true })
    totalCount?: number;
  }

  return AbstractConnection;
}
