import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";

import { createPostInput, updatePostInput } from "mysecondpackinsweden";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  try {
    const authHeader = c.req.header("Authorization") || "";
    const user = await verify(authHeader, c.env.JWT_SECRET);

    if (user) {
      c.set("userId", String(user.id));
      await next();
    } else {
      c.status(403);
      return c.json({
        message: "You are not Logged",
      });
    }
  } catch (e) {
    c.status(403);
    return c.json({
      message: "You are not Logged",
    });
  }
});

blogRouter.post("/", async (c) => {
  const userId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();

  const { success } = createPostInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      Error: "Inputs are not valid",
    });
  }

  const blog = await prisma.blog.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(userId),
    },
  });
  return c.json({
    id: blog.id,
  });
});

blogRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();

  const { success } = updatePostInput.safeParse(body);

  if (!success) {
    c.status(411);
    return c.json({
      Error: "Inputs are not valid",
    });
  }

  const updatedBlog = await prisma.blog.update({
    where: {
      id: Number(body.id),
    },
    data: {
      title: body.title,
      content: body.content,
    },
  });
  c.json({
    updated: updatedBlog.id,
  });
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const blogs = await prisma.blog.findMany({});

  return c.json({ blogs });
});

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.blog.findUnique({
    where: {
      id: Number(id),
    },
  });
  return c.json(blog);
});
