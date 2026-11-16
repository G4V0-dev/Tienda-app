/**
 * Catálogo inicial. Solo se usa para sembrar la tabla products la primera vez.
 * La fuente de verdad en ejecución es la base de datos.
 */
module.exports = [
  {
    id: 1,
    name: 'Camiseta Clásica',
    description: 'Algodón 100%, corte regular, uso diario.',
    price: 45000,
    color: '#dbe4ee',
    stock: 500
  },
  {
    id: 2,
    name: 'Camiseta Oversize',
    description: 'Corte amplio, algodón pesado, unisex.',
    price: 55000,
    color: '#e8ddcf',
    stock: 500
  },
  {
    id: 3,
    name: 'Camisa de Lino',
    description: 'Lino fresco, botones nacarados, manga larga.',
    price: 89000,
    color: '#dfe8dc',
    stock: 500
  },
  {
    id: 4,
    name: 'Hoodie Urbano',
    description: 'Felpa suave, capota ajustable, bolsillo canguro.',
    price: 120000,
    color: '#d6d6e3',
    stock: 500
  },
  {
    id: 5,
    name: 'Jogger Suave',
    description: 'Jogger cómodo con puños elásticos.',
    price: 95000,
    color: '#e3d6d6',
    stock: 500
  },
  {
    id: 6,
    name: 'Gorra Básica',
    description: 'Gorra de algodón con cierre ajustable.',
    price: 39000,
    color: '#e6e2d6',
    stock: 500
  }
];
