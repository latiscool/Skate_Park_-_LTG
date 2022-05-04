//Modulos
const express = require('express');
const app = express();
const exphbs = require('express-handlebars');
const expressFileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const PORT = process.env.PORT;
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const secretKey = process.env.SECRET;

const {
  nuevoUsuario,
  getUsuarios,
  usuarioStatus,
  loginUsuario,
  usuarioActualizar,
  usuarioEliminar,
  obtenerFoto,
} = require('./consulta');
const { send } = require('process');

//Levantando Server
app.listen(PORT, () => console.log(`💻Servidor ejcutandose en puerto ${PORT}`));

//MIDDLEWARS
//*************
//Recibir la imagen que es cargada al server atraves de un formulario html
app.use(bodyParser.urlencoded({ extended: false })); // Recibir datos solo como cadena de string (c/false)
//Recibir el apuload de Put y Pos
app.use(bodyParser.json());
//Acceso Publico (para css e img)
app.use(express.static(`${__dirname}/public`));
//Configuracio de la carga de archivo(img)
app.use(
  expressFileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, //Tamaño max soportado 5MB
    abortOnLimit: true,
    responseOnLimit: 'Tamaño de la imagen excede el limite permitido (5MB)',
  })
);
//Bootstrap Css
app.use(
  '/bootstrap',
  express.static(`${__dirname}/node_modules/bootstrap/dist/css`)
);

app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));

//Defiendo el motor de plantilla
app.set('view engine', '.hbs');
//Configuracion Handlebars
app.engine(
  'hbs',
  exphbs.engine({
    defaultLayout: 'main',
    layoutsDir: `${__dirname}/views/mainLayout`,
    extname: '.hbs',
  })
); //---End Middlewares

//**RUTAS ****
//GET -  RENDERIZADOS
//*******************

//INDEX - Lista de Participacion (Raiz del Proyecto)
app.get('/', async (_req, res) => {
  try {
    const usuarios = await getUsuarios();
    res.render('index', { usuarios });
  } catch (error) {
    res.status(500).send({
      error: `Algo salio mal en Ruta Raiz: ${error}`,
      code: 500,
    });
  }
});
app.get('/login', (req, res) => {
  res.render('Login');
});

app.get('/registro', (req, res) => {
  res.render('registro');
});

//ADMIN (Autorizacion de usuarios)
app.get('/admin', async (req, res) => {
  try {
    const usuarios = await getUsuarios();
    //Se renderiza Admin, despuede la invocacion de la funcion getUsuarios, el cual retorna una arreglo de usuario de la BD
    //Donde usuariod es un arreglo que se pasa como parametros para usar en plantilla Admin.hbs
    res.render('Admin', { usuarios });
  } catch (error) {
    res.status(500).send({
      error: 'Algo salio mal en  Renderizar Pagina Admin',
      code: 500,
    });
  }
});

//POST - Ruta Usuarios registrar
//Redireccion a la Login, despues de un registro
app.post('/usuarios', async (req, res) => {
  const { email, nombre, pwd1, exp, esp } = req.body;
  // console.log('req.body', req.body);
  const { foto } = req.files; //de files extraemos lo que se carga (el fichero) en el input con el name=foto
  //  Evitar que se sobrescriban las fotos de perfil - se crea un ID mas nombre del archivo que sera el nombre del usuario
  const idFoto = uuidv4().slice(0, 8);
  const fotoPerfil = `${nombre}-${idFoto}`;

  try {
    foto.mv(`${__dirname}/public/uploads/${fotoPerfil}`, (err) => {
      if (err) res.status(500).send('Error al subir la imagen');
      res.status(201).redirect('/');
    });
    // console.log("name joto al funcion", name);
    await nuevoUsuario(email, nombre, pwd1, exp, esp, fotoPerfil);
  } catch (error) {
    res.status(500).send({
      error: `Algo salio mal en Registrar ..... ${error}`,
      code: 500,
    });
  }
});

//PUT - Autoriza usuario y desAutorizar / En Panel de Amdmin (casilla s/c ticket)
app.put('/usuarios', async (req, res) => {
  try {
    const { id, auth } = req.body;
    console.log('req.body put', req.body); //req.body put { id: 35, auth: true }

    const usuario = await usuarioStatus(id, auth);
    res.status(200).send(usuario);
  } catch (error) {
    res.status(500).send({
      error: `Algo salio mal en Autorizar.... ${error}`,
      code: 500,
    });
  }
});

//POST - En Login Valida al usuario
app.post('/verify', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await loginUsuario(email, password);
  const mapUser = usuario.map((e) => e.estado);

  // console.log("usuario",usuario);
  //   console.log('usuario verify [0]', mapUser[0]);

  if (usuario) {
    if (mapUser[0]) {
      const token = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + 180,
          data: usuario,
        },
        secretKey
      );
      res.send(token);
    } else {
      res.status(404).send({
        error: 'El usuario aun no ha sido validado.',
        code: 404,
      });
    }
  } else {
    res.status(404).send({
      error:
        'Este usuario no está registrado en la base de datos o la contraseña es incorrecta.',
      code: 404,
    });
  }
});


//GET - Datos Perfil Visualizar
app.get('/datos', async (req, res) => {
  const { token } = req.query;
  jwt.verify(token, secretKey, (err, decoded) => {
    const { data } = decoded;
    data.forEach((e) => {
      const email = e.email;
      const nombre = e.nombre;
      const password = e.pwd;
      const anos_experiencia = e.anos_experiencia;
      const especialidad = e.especialidad;
      console.log('nombre foreach', nombre);
      err
        ? res.status(401).send({
            error: '401 No tiene autorizacion',
            message: 'Solo usuario autorizados',
            token_error: err.message,
          })
        : res.render('Datos', {
            email,
            nombre,
            password,
            anos_experiencia,
            especialidad,
          });
    });
  });
});

//PUT - Actualizar Datos de Perfil
app.put('/update', async (req, res) => {
  const { email, nombre, password, experiencia, especialidad } = req.body;
  console.log('update', req.body);
  try {
    const usuario = await usuarioActualizar(
      email,
      nombre,
      password,
      experiencia,
      especialidad
    );
    res.status(200).send(usuario);
  } catch (error) {
    res.status(500).send({
      error: `Error al crear el usuario: ${error}`,
      code: 500,
    });
  }
});

//DELETE - Eliminar Usuario
app.delete('/delete/:email', async (req, res) => {
  const { email } = req.params;

  console.log('delete email', email);
  try {
    const { foto } = await obtenerFoto(email);
    console.log('foto delete', foto);
    const usuario = await usuarioEliminar(email);
    fs.unlink(`${__dirname}/public/uploads/${foto}`, (err) => {
      if (err) res.status(500).send('Error al subir al eliminar');
      res.status(200).send(usuario);
    });
  } catch (error) {
    res.status(500).send({
      error: `Error al eliminar el usuario: ${error}`,
      code: 500,
    });
  }
});
