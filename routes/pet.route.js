const router = require('express').Router();

const petController = require('../controller/pet.controller');

// Middleware для добавления заголовков CORS для всех маршрутов
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

router.get('/pet', petController.getAllPets);
router.post('/pet', petController.createPet);
router.get('/pet/:id', petController.getPetById);
router.put('/pet/:id', petController.updatePet);
router.delete('/pet/:id', petController.deletePet);


module.exports = router