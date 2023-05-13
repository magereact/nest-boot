import { createEntityService } from "@nest-boot/database";
import { mixinConnection } from "@nest-boot/graphql";
import { Cron } from "@nest-boot/schedule";
import { mixinSearchable } from "@nest-boot/search";
import { Injectable } from "@nestjs/common";

import { Post } from "./post.entity";

@Injectable()
export class PostService extends mixinConnection(
  mixinSearchable(createEntityService(Post), {
    index: "Post",
    filterableFields: [
      "id",
      "message",
      "createdAt",
      "user.name",
      "user.createdAt",
    ],
    searchableFields: ["id", "message", "createdAt", "user.name"],
  })
) {
  @Cron("* * * * * *")
  async test() {
    const posts = await this.repository.findAll();
    console.log("test", posts.length);
  }
}
