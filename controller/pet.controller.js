const pool = require('../db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });
//че мне с этим делать?

class petController { 
    async getAllPets(req, res) {
        try {
            const result = await pool.query('SELECT * FROM pets');
            res.json(result.rows);
        } catch (error) {
            res.status(500).json({ message: 'Ошибка сервера', error });
        }
    }

    async getPetById(req, res) {
        const { id } = req.params;
        try {
            const result = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Питомец не найден' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ message: 'Ошибка сервера', error });
        }
    }

    async createPet(req, res) {
        /*try {
            const { name, breed, gender, age, about, type } = req.body;
            const imageFiles = req.files; // массив файлов изображений
            const imageUrls = [];

            // Загрузка каждого изображения на Cloudinary и сбор ссылок
            for (const file of imageFiles) {
                const result = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        { resource_type: 'image' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url); // ссылка на загруженное изображение
                        }
                    ).end(file.buffer); // Загружаем из буфера файла
                });
                imageUrls.push(result); // Добавляем ссылку в массив
            }

            // Сохранение данных питомца в базу данных, включая массив ссылок
            const newPet = await pool.query(
                `INSERT INTO pets (name, breed, gender, age, about, type, image_url, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7::VARCHAR[], NOW(), NOW())
                 RETURNING *`,
                [name, breed, gender, age, about, type, imageUrls]
            );

            res.json(newPet.rows[0]);
        } catch (error) {
            console.error('Ошибка при добавлении питомца:', error.message);
            res.status(500).json({ error: 'Ошибка при добавлении питомца' });
        }*/
        try {
            const { name, breed, gender, age, about, type, image_url } = req.body; 
            
            const newPet = await pool.query(
              `INSERT INTO pets (name, breed, gender, age, about, type, image_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7::VARCHAR[], NOW(), NOW())
               RETURNING *`,
              [name, breed, gender, age, about, type, image_url]
            );
        
            res.json(newPet.rows[0]);
          } catch (error) {
            console.error(error.message);
            res.status(500).json({ error: 'Ошибка при добавлении питомца' });
          }      
    }

    async updatePet(req, res) {
        const { id } = req.params;
        const { name, breed, gender, age, about, image_url, type } = req.body;
        try {
            const result = await pool.query(
                'UPDATE pets SET name = $1, breed = $2, gender = $3, age = $4, about = $5, image_url = $6, type=$7 WHERE id = $8 RETURNING *',
                [name, breed, gender, age, about, image_url, type, id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Питомец не найден' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ message: 'Ошибка сервера', error });
        }
    }

    async deletePet(req, res) {
        const { id } = req.params;
        try {
            const result = await pool.query('DELETE FROM pets WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Питомец не найден' });
            }
            res.json({ message: 'Питомец удален', pet: result.rows[0] });
        } catch (error) {
            res.status(500).json({ message: 'Ошибка сервера', error });
        }
    }
}

module.exports = new petController();
