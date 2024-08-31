const main = ({ app, prisma }) => {
  app.post("/create-video", async (req, res) => {
    // try {
    //   const { title, description, tags, url } = req.body;

    //   const newVideo = await prisma.video.create({
    //     data: {
    //       title,
    //       description,
    //       url,
    //     }
    //   });

    //   res.json(newVideo);
    // } catch (error) {
    //   console.error("Error creating video:", error);
    //   res.status(500).send("Error creating video");
    // }
  });
};

export default main;
