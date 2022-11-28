// eslint-disable-next-line max-classes-per-file
import { Field, Int, ObjectType } from "@nestjs/graphql";

import { PageInfo } from "../dtos";
import { Connection } from "../interfaces/connection.interface";
import { Edge as BaseEdge } from "../interfaces/edge.interface";
import { Type } from "../interfaces/type.interface";

export function createConnection<T>(
  NodeType: Type<T> | T
): Type<Connection<T>> {
  const name =
    typeof NodeType === "symbol"
      ? NodeType.description
      : (NodeType as Type<T>).name;

  @ObjectType(`${name}Edge`)
  class Edge implements BaseEdge<T> {
    @Field(() => NodeType as Type<T>)
    node!: T;

    @Field()
    cursor!: string;
  }

  @ObjectType({ isAbstract: true })
  class AbstractConnection implements Connection<T> {
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
