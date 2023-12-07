const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const port = 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://turf:9t7s8TWNwTJpfZWc@cluster0.xk69pxb.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const usersCollection = client.db("Turf").collection("user");
    const notificationCollection = client.db("Turf").collection("notification");
    const turfCollection = client.db("Turf").collection("TurfInfo");
    const bookingCollection = client.db("Turf").collection("booking");
    const holdCollection = client.db("Turf").collection("hold");
    const shopCollection = client.db("Turf").collection("Shop");
    const advertisedCollection = client.db("Turf").collection("advertise");
    const shopOrderCollection = client.db("Turf").collection("ShopOrder");
    const customOrderCollection = client.db("Turf").collection("customOrder");
    const wishlistCollection = client.db("Turf").collection("wishList");

    app.get("/users", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      if (req.query.role) {
        query = { role: req.query.role };
      }
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/verify", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          varify: "True",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/notification", async (req, res) => {
      const msg = req.body;
      const result = await notificationCollection.insertOne(msg);
      res.send(result);
    });
    app.get("/notification", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await notificationCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/notification/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await notificationCollection.deleteOne(query);
      res.send(result);
    });

    // Eron
    app.get("/allTurf", async (req, res) => {
      const date = req.query.date;
      let query = {};
      const options = await turfCollection.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      let alreadyBooked = await bookingCollection.find(bookingQuery).toArray();
      const holdData = await holdCollection.find(bookingQuery).toArray();
      alreadyBooked.push(...holdData);
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.turfName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });
    // search by name start-->
    app.get("/searchTurf", async (req, res) => {
      const date = req.query.date;
      const name = req.query.name;
      const upperCase = name.toUpperCase();
      let query = {
        // name: { $regex: new RegExp(upperCase, "i") },
        name: upperCase,
      };
      const options = await turfCollection.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.turfName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
      console.log("t", options);
    });
    // search by name end--->
    // search by location start-->
    app.get("/searchLocation", async (req, res) => {
      const date = req.query.date;
      const location = req.query.location;
      let query = {
        location: location,
      };
      const options = await turfCollection.find(query).toArray();
      const bookingQuery = { bookingDate: date };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.turfName === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      console.log(options);
      res.send(options);
    });
    // search by location end--->
    app.post("/booking", async (req, res) => {
      const data = req.body;
      const result = await bookingCollection.insertOne(data);
      res.send(result);
      console.log(result);
    });

    // hold start-->
    app.post("/hold", async (req, res) => {
      const data = req.body;
      data.createdAt = new Date();

      const result = await holdCollection.insertOne(data);
      cleanupJob.start();

      res.send(result);
    });
    app.get("/hold", async (req, res) => {
      let query = {};
      if (req.query.customerEmail) {
        query = { email: req.query.customerEmail };
      }
      const result = await holdCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/hold/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await holdCollection.deleteOne(query);
      res.send(result);
    });
    const cleanupJob = cron.schedule(
      "*/1 * * * *",
      async () => {
        const thirtySecondsAgo = new Date();
        thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);

        try {
          // Find and remove documents older than 30 seconds
          const result = await holdCollection.deleteMany({
            createdAt: { $lt: thirtySecondsAgo },
          });
          console.log(`${result.deletedCount} document(s) deleted.`);
        } catch (error) {
          console.error("Error deleting documents:", error);
        }
      },
      {
        scheduled: false, // The job will not run immediately after scheduling
      }
    );

    // Sakib
    app.get("/booking", async (req, res) => {
      let query = {};
      if (req.query.customerEmail) {
        query = { email: req.query.customerEmail };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.patch("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          gameStatus: "over",
        },
      };
      const result = await bookingCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
      console.log(result);
    });
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/bookedData", async (req, res) => {
      let query = {};
      const queryName = req.query.name;
      const updateName = queryName.toUpperCase();
      if (queryName) {
        query = { turfName: updateName };
        console.log(query);
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/advertise", async (req, res) => {
      let query = {};
      if (req.query.productId) {
        query = { productId: req.query.productId };
      }
      const result = await advertisedCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/advertise", async (req, res) => {
      const wishList = req.body;
      const result = await advertisedCollection.insertOne(wishList);
      console.log(result);
      res.send(result);
    });
    app.delete("/advertise/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await advertisedCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/turfCollection", async (req, res) => {
      let query = {};
      const result = await turfCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/turfCollection/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await turfCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    app.patch("/turfCollection/:id", async (req, res) => {
      const id = req.params.id;
      let query = {};
      const options = { upsert: true };
      let updatedDoc = {
        $set: {},
      };
      if (req.body.data) {
        console.log(req.body.data);
        query = { _id: new ObjectId(id) };
        updatedDoc = {
          $set: {
            discount: req.body.data.discount,
            promo: req.body.data.promo,
          },
        };
      }
      if (req.body.advertise) {
        query = { _id: new ObjectId(id) };

        updatedDoc = {
          $set: {
            advertise: req.body.advertise,
          },
        };
      }
      const result = await turfCollection.updateOne(query, updatedDoc, options);
      res.send(result);
      console.log(result);
    });
    app.delete("/turfCollection/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await turfCollection.deleteOne(query);
      res.send(result);
    });

    // Suraiya
    /* display all shop product */
    app.get("/shop", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await shopCollection.find(query).toArray();
      res.send(result);
    });
    /* display specific id product to show specific info of a product in cart */
    app.get("/shop/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shopCollection.findOne(query);
      console.log(result);
      res.send(result);
    });
    /* insert shop data */
    app.post("/shop", async (req, res) => {
      const data = req.body;
      const result = await shopCollection.insertOne(data);
      cleanupJob.start();

      res.send(result);
    });
    /* update shop product info */
    app.patch("/shop/:id", async (req, res) => {
      const id = req.params.id;
      let query = {};
      const options = { upsert: true };
      let updatedDoc = {
        $set: {},
      };
      if (req.body.data) {
        console.log(req.body.data);
        query = { _id: new ObjectId(id) };
        updatedDoc = {
          $set: {
            description: req.body.data.description,
            productPrice: req.body.data.productPrice,
            stock: req.body.data.stock,
          },
        };
      }
      if (req.body.advertise) {
        query = { _id: new ObjectId(id) };

        updatedDoc = {
          $set: {
            advertise: req.body.advertise,
          },
        };
      }
      if (req.body.stock !== undefined) {
        query = { _id: new ObjectId(id) };
        if (req.body.stock === 0) {
          updatedDoc = {
            $set: {
              stock: "0",
            },
          };
        } else {
          updatedDoc = {
            $set: {
              stock: req.body.stock,
            },
          };
        }
      }
      const result = await shopCollection.updateOne(query, updatedDoc, options);
      res.send(result);
      console.log(result);
    });

    app.delete("/shop/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shopCollection.deleteOne(query);
      res.send(result);
    });
    /* search by name */
    app.get("/searchProduct", async (req, res) => {
      const name = req.query.name;
      const upperCase = name.toUpperCase();
      let query = {
        // name: { $regex: new RegExp(upperCase, "i") },
        productName: upperCase,
      };
      const options = await shopCollection.find(query).toArray();
      res.send(options);
    });
    /* search by category */
    app.get("/searchProductCategory", async (req, res) => {
      const category = req.query.category;
      let query = {
        category: category,
      };
      const options = await shopCollection.find(query).toArray();
      res.send(options);
    });
    /* get ordered product */
    app.get("/shopOrder", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await shopOrderCollection.find(query).toArray();
      res.send(result);
    });
    /* insert a order */
    app.post("/shopOrder", async (req, res) => {
      const data = req.body;
      const result = await shopOrderCollection.insertOne(data);
      res.send(result);
    });
    /* get specific ordered data */
    app.delete("/shopOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await shopOrderCollection.deleteOne(query);
      res.send(result);
    });
    /* get customer data */
    app.get("/customOrder", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await customOrderCollection.find(query).toArray();
      res.send(result);
    });
    /* insert cutomer order data */
    app.post("/customOrder", async (req, res) => {
      const data = req.body;
      const result = await customOrderCollection.insertOne(data);
      res.send(result);
    });
    /* update customer order data */
    app.patch("/customOrder/:id", async (req, res) => {
      const id = req.params.id;
      let query = {};
      const options = { upsert: true };
      let updatedDoc = {
        $set: {},
      };
      if (req.body.approval) {
        query = { _id: new ObjectId(id) };
        updatedDoc = {
          $set: {
            approval: req.body.approval,
          },
        };
      }

      const result = await customOrderCollection.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
      console.log(result);
    });
    app.delete("/customOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await customOrderCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Turf server is running");
});

app.listen(port, () => console.log(`Turf server is running on ${port}`));
