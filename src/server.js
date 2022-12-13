import dayjs from "dayjs";
import dotenv from "dotenv";
import express from "express";
import joi from "joi";
import cors from "cors";
import connection from "./database.js";
import { parseISO, isAfter } from "date-fns";

const categorySchema = joi.object({
  name: joi.string().min(1).required(),
});

const gameSchema = joi.object({
  name: joi.string().min(1).required(),
  image: joi.string().min(1).required(),
  stockTotal: joi.number().min(1).required(),
  pricePerDay: joi.number().min(1).required(),
  categoryId: joi.number().min(1).required(),
});

const userSchema = joi.object({
  name: joi.string().min(1).required(),
  phone: joi.string().min(10).max(11).required(),
  cpf: joi.string().min(11).max(11),
  birthday: joi.string().isoDate().required(),
});

const rentalsSchema = joi.object({
  customerId: joi.number().min(1).required(),
  gameId: joi.number().min(1).required(),
  daysRented: joi.number().min(1).required(),
});

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/categories", async (req, res) => {
  try {
    const getCategories = await connection.query("SELECT * FROM categories;");
    res.status(201).send(getCategories.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/categories", async (req, res) => {
  const name = req.body;

  const validation = categorySchema.validate(name, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const nameExist = await connection.query(
      "SELECT * FROM categories WHERE name=$1",
      [name.name]
    );
    console.log(nameExist);

    if (nameExist.rows.length !== 0) {
      return res
        .status(409)
        .send({ message: "Essa categoria já está cadastrada" });
    }

    await connection.query("INSERT INTO categories (name) VALUES ($1)", [
      name.name,
    ]);
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/games", async (req, res) => {
  const { name } = req.query;

  try {
    const filterGames = await connection.query(
      `SELECT * FROM games WHERE name ILIKE '${name}%'`
    );
    if (name) {
      return res.send(filterGames.rows);
    }

    const getGames =
      await connection.query(`SELECT games.*, categories.name AS "categoryName" FROM
      games JOIN categories ON games."categoryId" = categories.id;
    `);
    res.send(getGames.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/games", async (req, res) => {
  const value = req.body;

  const validation = gameSchema.validate(value, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  try {
    const existCategoryId = await connection.query(
      `SELECT * FROM categories WHERE id=$1;`,
      [value.categoryId]
    );

    const existName = await connection.query(
      "SELECT * FROM games WHERE name=$1",
      [value.name]
    );

    if (existCategoryId.rows.length === 0) {
      return res.sendStatus(400);
    }

    if (existName.rows.length !== 0) {
      return res.sendStatus(409);
    }

    await connection.query(
      `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`,
      [
        value.name,
        value.image,
        value.stockTotal,
        value.categoryId,
        value.pricePerDay,
      ]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customers", async (req, res) => {
  const { cpf } = req.query;
  try {
    const filterCPF = await connection.query(
      `SELECT * FROM customers WHERE cpf ILIKE '${cpf}%'`
    );
    const getCostumers = await connection.query(`SELECT * FROM customers;`);

    if (cpf) {
      return res.send(filterCPF.rows);
    }

    res.send(getCostumers.rows);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/customers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const customerId = await connection.query(
      `SELECT * FROM customers WHERE id=$1`,
      [id]
    );

    if (customerId.rows.length === 0) {
      return res.sendStatus(404);
    }
    res.send(customerId.rows[0]);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/customers", async (req, res) => {
  const user = req.body;

  const validation = userSchema.validate(user, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(400).send(errors);
  }

  try {
    const existCPF = await connection.query(
      `SELECT (cpf) FROM customers WHERE cpf=$1`,
      [user.cpf]
    );

    console.log(existCPF);
    if (existCPF.rows.length !== 0) {
      return res.sendStatus(409);
    }

    await connection.query(
      `INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`,
      [user.name, user.phone, user.cpf, user.birthday]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.put("/customers/:id", async (req, res) => {
  const { id } = req.params;
  const user = req.body;

  const validation = userSchema.validate(user, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(400).send(errors);
  }

  try {
    const existCPF = await connection.query(
      `SELECT (cpf) FROM customers WHERE cpf=$1`,
      [user.cpf]
    );

    // console.log(existCPF);
    if (existCPF.rows.length !== 0) {
      return res.sendStatus(409);
    }

    await connection.query(
      `UPDATE customers SET name=$1, phone=$2, cpf=$3, birthday=$4 WHERE id=${id}`,
      [user.name, user.phone, user.cpf, user.birthday]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/rentals", async (req, res) => {
  const { customerId, gameId } = req.query;

  try {
    if (customerId) {
      const filterCustomerId = await connection.query(
        `SELECT * FROM rentals WHERE "customerId"=$1`,
        [customerId]
      );
      return res.send(filterCustomerId.rows);
    }

    if (gameId) {
      const filterGameId = await connection.query(
        `SELECT * FROM rentals WHERE "gameId"=$1`,
        [gameId]
      );
      return res.send(filterGameId.rows);
    }

    const getRentals =
      await connection.query(`SELECT rentals.*, customers.id AS "idCustomer", 
      customers.name AS "nameCustomer", 
      games.id AS 
      "idGame", games.name AS "gameName", 
      games."categoryId" AS 
      "categoryIdGame", categories.name AS "categoryName" FROM rentals
        JOIN 
      customers ON rentals."customerId" = customers.id 
        JOIN 
      games ON rentals."gameId" = games.id 
        JOIN 
      categories ON games."categoryId" = categories.id;
    `);
    // console.log(getRentals.rows);

    const sendFormat = getRentals.rows.map((el) => {
      return {
        id: el.id,
        customerId: el.customerId,
        gameId: el.gameId,
        rentDate: el.rentDate,
        daysRented: el.daysRented,
        returnDate: el.returnDate,
        originalPrice: el.originalPrice,
        delayFee: el.delayFee,
        customer: {
          id: el.idCustomer,
          name: el.nameCustomer,
        },
        game: {
          id: el.idGame,
          name: el.gameName,
          categoryId: el.categoryIdGame,
          categoryName: el.categoryName,
        },
      };
    });

    res.send(sendFormat);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/rentals", async (req, res) => {
  const values = req.body;
  const time = new Date();

  const validation = rentalsSchema.validate(values, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(400).send(errors);
  }
  try {
    const pricePerDay = await connection.query(
      `SELECT "pricePerDay" from games WHERE id=$1`,
      [values.gameId]
    );
    // console.log(pricePerDay.rows[0]);
    const originalPrice = pricePerDay.rows[0].pricePerDay * values.daysRented;
    // console.log(originalPrice);

    const userExist = await connection.query(
      `SELECT (id) FROM customers WHERE id=$1`,
      [values.customerId]
    );

    const gameExist = await connection.query(
      `SELECT (id) FROM games where id=$1`,
      [values.gameId]
    );
    const stock = await connection.query(
      `SELECT "stockTotal" FROM games WHERE id=$1`,
      [values.gameId]
    );

    // console.log(userExist, gameExist, stock)
    if (userExist.rows.length === 0) {
      return res.sendStatus(400);
    }

    if (gameExist.rows.length === 0) {
      return res.sendStatus(400);
    }

    if (values.daysRented < 1) {
      return res.sendStatus(400);
    }

    if (stock.rows[0] < 1) {
      return res.sendStatus(400);
    }

    await connection.query(
      `INSERT INTO 
      rentals 
      ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") 
        VALUES($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        values.customerId,
        values.gameId,
        time,
        values.daysRented,
        null,
        originalPrice,
        null,
      ]
    );
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/rentals/:id/return", async (req, res) => {
  const id = parseInt(req.params.id);
  const time = new Date();

  try {
    const getRental = await connection.query(
      `SELECT rentals.*, games."pricePerDay" 
    FROM 
    rentals 
    JOIN games 
    ON rentals."gameId" = games.id 
    WHERE rentals.id=$1`,
      [id]
    );
    if (getRental.rows.length === 0) {
      return res.sendStatus(404);
    }
    if (getRental.rows[0].returnDate !== null) {
      return res.sendStatus(400);
    }

    const deliveryTime = getRental.rows[0].rentDate;
    const timeDiff = Math.abs(time.getTime() - deliveryTime.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const newdelayFee =
      diffDays * getRental.rows[0].pricePerDay +
      getRental.rows[0].originalPrice;
    console.log(
      deliveryTime,
      timeDiff,
      diffDays,
      getRental.rows[0].daysRented,
      newdelayFee
    );

    if (diffDays > getRental.rows[0].daysRented) {
      const newdelayFee =
        diffDays * getRental.rows[0].pricePerDay +
        getRental.rows[0].originalPrice;
      await connection.query(
        `UPDATE rentals SET "returnDate"=$1, "delayFee"=$2, WHERE id=$3`,
        [time, newdelayFee, id]
      );
    }

    await connection.query(
      `UPDATE rentals SET "returnDate"=$1, "delayFee"=$2 WHERE id=$3`,
      [time, null, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.delete("/rentals/:id", async (req, res) => {
  const { id } = req.params;

  const idExist = await connection.query(`SELECT * FROM rentals WHERE id=$1`, [
    id,
  ]);

  console.log(idExist);

  if (idExist.rows.length === 0) {
    return res.sendStatus(404);
  }

  if (idExist.rows[0].returnDate !== null) {
    return res.sendStatus(400);
  }

  await connection.query(`DELETE FROM rentals WHERE id=$1`, [id]);
  res.sendStatus(200);
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running in port ${port}`));
