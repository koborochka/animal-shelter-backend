const pool = require("../db");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

class petController {
	async getAllPets(req, res) {
		const page = parseInt(req.query.page) || 1;
		const perPage = parseInt(req.query.perPage) || 50;
		const sort = req.query.sort || "id";
		const order = req.query.order || "ASC";

		const filter = req.query.filter ? JSON.parse(req.query.filter) : {};

		try {
			let query = "SELECT * FROM pets";
			let values = [];
			let conditions = [];

			if (filter.type) {
				if (filter.type !== 'all'){
					values.push(filter.type);
					conditions.push(`type = $${values.length}`);
				}		
			}
			if (filter.gender) {
				values.push(filter.gender);
				conditions.push(`gender = $${values.length}`);
			}
			if (filter.q) {
				values.push(`%${filter.q}%`);
				conditions.push(
					`(name ILIKE $${values.length} OR breed ILIKE $${values.length} OR description ILIKE $${values.length})`
				);
			}
			if (conditions.length > 0) {
				query += " WHERE " + conditions.join(" AND ");
			}

			// Проверка допустимых значений для сортировки и порядка
			const validSortFields = ["id", "birthdate"];
			const validOrderValues = ["ASC", "DESC"];
			const sortField = validSortFields.includes(sort) ? sort : "id"; // сортировка по id по умолчанию
			const sortOrder = validOrderValues.includes(order.toUpperCase())
				? order.toUpperCase()
				: "ASC"; // порядок по возрастанию по умолчанию

			// Сортировка
			query += ` ORDER BY ${sortField} ${sortOrder}`;

			// Пагинация
			query += ` LIMIT $${values.length + 1} OFFSET $${
				values.length + 2
			}`;
			values.push(perPage, (page - 1) * perPage);

			// Выполняем запрос
			const result = await pool.query(query, values);

			// Запрос для получения общего количества записей
			const totalQuery =
				"SELECT COUNT(*) FROM pets" +
				(conditions.length > 0
					? " WHERE " + conditions.join(" AND ")
					: "");
			const totalResult = await pool.query(
				totalQuery,
				values.slice(0, values.length - 2)
			);
			const total = totalResult.rows[0].count;

			// Устанавливаем заголовок Content-Range
			res.set(
				"Content-Range",
				`pets ${(page - 1) * perPage}-${
					(page - 1) * perPage + result.rows.length - 1
				}/${total}`
			);

			res.json(result.rows);		
		} catch (error) {
			res.status(500).json({ message: "Ошибка сервера", error });
		}
	}

	async getPetById(req, res) {
		const { id } = req.params;
		try {
			const result = await pool.query(
				"SELECT * FROM pets WHERE id = $1",
				[id]
			);
			if (result.rows.length === 0) {
				return res.status(404).json({ message: "Питомец не найден" });
			}
			res.json(result.rows[0]);
		} catch (error) {
			res.status(500).json({ message: "Ошибка сервера", error });
		}
	}

	async createPet(req, res) {
		try {
			const { name, breed, gender, about, type, description, birthdate } =
				req.body;
			const images_url = req.files;

			const parseAboutFielt = (about) => about ? about.split(/<\/p>\s*<p>/).map(str => str.replace(/<\/?p>/g, '')) : [];

			if (!images_url || images_url.length === 0) {
				return res
					.status(400)
					.json({
						message:
							"Необходимо загрузить хотя бы одно изображение",
					});
			}

			const uploadImageBuffer = (buffer, public_id) => {
				return new Promise((resolve, reject) => {
					const uploadStream = cloudinary.uploader.upload_stream(
						{
							public_id: public_id,
							folder: "pets",
							transformation: [
								{
									crop: "fill",
									gravity: "auto",
									aspect_ratio: "37:28",
								}
							]
	
						},
						(error, result) => {
							if (error) reject(error);
							else {
								resolve({
									secure_url: result.secure_url,
									public_id: result.public_id,
									});
							}
						}
					);

					uploadStream.end(buffer);
				});
			};

			const imageUrls = await Promise.all(
				images_url.map(async (image) => {
					return uploadImageBuffer(image.buffer, image.originalname);
				})
			);

			// Сохранение данных питомца в базе данных
			const newPet = await pool.query(
				`INSERT INTO pets (name, breed, gender, about, type, images_url, description, birthdate, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), NOW())
                RETURNING *`,
				[
					name,
					breed,
					gender,
					parseAboutFielt(about),
					type,
					JSON.stringify(imageUrls),
					description,
					birthdate,
				]
			);

			res.json(newPet.rows[0]);
		} catch (error) {
			console.error("Ошибка при добавлении питомца:", error.message);
			res.status(500).json({ error: `Ошибка при добавлении питомца ${error.message}` });
		}
	}

	async updatePet(req, res) {
		const { id } = req.params;
		const { name, breed, gender, about, images_url, type, description, birthdate } = req.body;

		const fields = [];
		const values = [];

		const updateField = (field, value) => {
			if (value !== undefined) {  // Изменение для проверки undefined
				fields.push(`${field} = $${fields.length + 1}`);
				values.push(value);
			}
		};

		updateField('name', name);
		updateField('breed', breed);
		updateField('gender', gender);
		updateField('type', type);
		//updateField('images_url', images_url); 
		updateField('about', about);
		updateField('description', description);
		updateField('birthdate', birthdate);
		
		

		if (fields.length === 0) {
			return res.status(400).json({ message: 'Нет полей для обновления' });
		}

		const query = `UPDATE pets SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING *`;
		values.push(id);

		try {
			const result = await pool.query(query, values);
			if (result.rows.length === 0) {
				return res.status(404).json({ message: 'Питомец не найден' });
			}
			res.json(result.rows[0]);
		} catch (error) {
			console.log("Ошибка при обновлении питомца:", error.message);
			res.status(500).json({ message: 'Ошибка сервера', error });
		}
	}    


	async deletePet(req, res) {
		const { id } = req.params;
		try {
			const petResult = await pool.query(
				"SELECT * FROM pets WHERE id = $1",
				[id]
			);
			if (petResult.rows.length === 0) {
				return res.status(404).json({ message: "Питомец не найден" });
			}

			const pet = petResult.rows[0];
			const images = pet.images_url;

			const deleteResult = await pool.query(
				"DELETE FROM pets WHERE id = $1 RETURNING *",
				[id]
			);

			const deleteImagePromises = images.map((image) =>
				cloudinary.uploader.destroy(image.public_id)
			);

			await Promise.all(deleteImagePromises);

			res.json({
				message: "Питомец и связанные изображения удалены",
				pet: deleteResult.rows[0],
			});
		} catch (error) {
			res.status(500).json({ message: "Ошибка сервера", error });
		}
	}
}

module.exports = new petController();
