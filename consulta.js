const { Pool } = require('pg');

const config = {
  user: 'postgres',
  host: 'localhost',
  password: 'postgresql',
  database: 'skatepark',
  port: 5432,
};

const pool = new Pool(config);

const nuevoUsuario = async (email, nombre, pwd, exp, esp, foto) => {
  //  console.log("email consulta", email)
  const query = {
    text: `INSERT INTO skaters (email, nombre, pwd, anos_experiencia, especialidad, foto, estado) VALUES ('${email}', '${nombre}', '${pwd}', '${exp}', '${esp}', '${foto}', false) RETURNING *;`,
  };

  try {
    const res = await pool.query(query);
    console.log('se ha realizo con exito el registrado');
    return res.rows;
  } catch (error) {
    console.log('Ha ocurrido un error en registrar ' + error);
    process.exit();
  }
};

const getUsuarios = async () => {
  const query = {
    text: 'SELECT * FROM skaters ;',
  };
  try {
    const res = await pool.query(query);
    console.log('Se realizo con exito la consulta de usuarios');

    return res.rows;
  } catch (error) {
    console.log('Ha ocurrido en consultar los usuarios ' + error);
    process.exit();
  }
};

const usuarioStatus = async (id, estado) => {
  const query = {
    text: `UPDATE skaters SET estado='${estado}' WHERE id='${id}' RETURNING *;`,
  };

  try {
    const res = pool.query(query);
    console.log('Cambio de Status exito');
    return res.rows;
  } catch (error) {
    console.log('Ha ocurrido un error en la autorizacion');
    process.exit();
  }
};

const getUsuario = async (email, pwd) => {
  try {
    const result = await pool.query(
      `SELECT * FROM skaters WHERE email = '${email}' AND pwd = '${pwd}' ;`
    );
    const usuarios = result.rows[0];
    return usuarios;
  } catch (e) {
    throw e;
  }
};

const loginUsuario = async (email, password) => {
  const query = {
    text: `SELECT * FROM skaters WHERE email='${email}' AND pwd='${password}';`,
  };

  try {
    const res = await pool.query(query);
    console.log("Consulta al usuario realizada con exito ");
    console.log("res.rows[0]",res.rows[0]);
    return res.rows;
  } catch (error) {
    console.log('Ha ocurrido un error en la consulta del usuario ' + error);
  }
};



const usuarioActualizar = async (email, nombre, password, anos_experiencia, especialidad)=> {
  try {
      const result = await pool.query(`UPDATE skaters SET  nombre = '${nombre}', pwd = '${password}', anos_experiencia = '${anos_experiencia}', especialidad = '${especialidad}' WHERE email = '${email}' RETURNING *`);
      console.log(`usuario ${result.rows[0].nombre} ha sido actualizado con éxito`);
      return result.rows;
  } catch (error) {
      console.log(error);
  }
}


const usuarioEliminar= async (email)=> {
  const query = {
      text: `DELETE FROM skaters WHERE email = '${email}' RETURNING *;`,
  
  };
  // console.log("email eliminar : ", email);
  try {
      const res = await pool.query(query);
      console.log(`El usuario ha sido eliminado con éxito`);
      // console.log("res: ", res.rows);
      return res.rows;
  } catch (e) {
    console.log('Ha ocurrido un error al eliminar BD ' + error);
  }
}

const obtenerFoto= async (email)=> {
  try {
      const result = await pool.query(`SELECT foto FROM skaters WHERE email = '${email}'`);
      return result.rows[0];
  } catch (error) {
      console.log(error);
  }
}

module.exports = {
  nuevoUsuario,
  getUsuarios,
  usuarioStatus,
  getUsuario,
  loginUsuario,
  usuarioActualizar,
  usuarioEliminar,
  obtenerFoto
};
