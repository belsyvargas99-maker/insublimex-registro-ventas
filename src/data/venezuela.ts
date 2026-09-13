// Estados de Venezuela con sus ciudades y poblaciones principales.
// Cada estado incluye implícitamente la opción "Otra ciudad" en la UI para
// que el cliente escriba a mano una localidad que no aparezca.

export interface VenezuelaState {
  id: string;
  name: string;
  cities: string[];
}

export const VENEZUELA_STATES: VenezuelaState[] = [
  {
    id: 'amazonas',
    name: 'Amazonas',
    cities: ['Puerto Ayacucho', 'San Fernando de Atabapo', 'Maroa', 'San Carlos de Río Negro', 'La Esmeralda', 'San Juan de Manapiare', 'Isla Ratón'],
  },
  {
    id: 'anzoategui',
    name: 'Anzoátegui',
    cities: ['Barcelona', 'Puerto La Cruz', 'Lechería', 'El Tigre', 'Anaco', 'Guanta', 'Cantaura', 'San José de Guanipa (El Tigrito)', 'Clarines', 'Píritu', 'Puerto Píritu', 'Pariaguán', 'Aragua de Barcelona', 'Soledad', 'Onoto', 'Santa Ana', 'Valle de Guanape', 'Boca de Uchire'],
  },
  {
    id: 'apure',
    name: 'Apure',
    cities: ['San Fernando de Apure', 'Guasdualito', 'Achaguas', 'Biruaca', 'Bruzual', 'Elorza', 'Mantecal', 'San Juan de Payara', 'El Amparo', 'Puerto Páez'],
  },
  {
    id: 'aragua',
    name: 'Aragua',
    cities: ['Maracay', 'Turmero', 'La Victoria', 'Cagua', 'Villa de Cura', 'El Limón', 'Palo Negro', 'Santa Cruz de Aragua', 'San Mateo', 'Colonia Tovar', 'Las Tejerías', 'Santa Rita', 'Camatagua', 'Ocumare de la Costa', 'Magdaleno', 'San Sebastián de los Reyes', 'Barbacoas', 'El Consejo', 'Choroní', 'San Casimiro', 'Tocorón'],
  },
  {
    id: 'barinas',
    name: 'Barinas',
    cities: ['Barinas', 'Barinitas', 'Socopó', 'Santa Bárbara de Barinas', 'Sabaneta', 'Ciudad Bolivia (Pedraza)', 'Obispos', 'Libertad', 'Barrancas', 'Arismendi', 'Ciudad de Nutrias', 'El Cantón', 'Puerto de Nutrias', 'Dolores', 'Altamira de Cáceres'],
  },
  {
    id: 'bolivar',
    name: 'Bolívar',
    cities: ['Ciudad Bolívar', 'Ciudad Guayana (Puerto Ordaz)', 'Ciudad Guayana (San Félix)', 'Upata', 'Tumeremo', 'El Callao', 'Guasipati', 'Caicara del Orinoco', 'Santa Elena de Uairén', 'El Dorado', 'Ciudad Piar', 'El Palmar', 'Maripa', 'El Manteco', 'Las Claritas', 'La Paragua'],
  },
  {
    id: 'carabobo',
    name: 'Carabobo',
    cities: ['Valencia', 'Puerto Cabello', 'Guacara', 'Naguanagua', 'San Diego', 'Los Guayos', 'Mariara', 'Tocuyito', 'Bejuma', 'Montalbán', 'Morón', 'San Joaquín', 'Güigüe', 'Miranda', 'Belén', 'Yagua', 'Vigirima', 'Borburata'],
  },
  {
    id: 'cojedes',
    name: 'Cojedes',
    cities: ['San Carlos', 'Tinaquillo', 'Tinaco', 'El Baúl', 'El Pao', 'Las Vegas', 'Libertad', 'Macapo', 'Cojedes', 'Manrique'],
  },
  {
    id: 'delta-amacuro',
    name: 'Delta Amacuro',
    cities: ['Tucupita', 'Pedernales', 'Curiapo', 'San José de Amacuro (Sierra Imataca)', 'Los Castillos de Guayana'],
  },
  {
    id: 'distrito-capital',
    name: 'Distrito Capital',
    cities: ['Caracas', 'Caracas – El Paraíso', 'Caracas – La Candelaria', 'Caracas – Catia', 'Caracas – El Recreo', 'Caracas – La Vega', 'Caracas – El Valle', 'Caracas – Coche', 'Caracas – Caricuao', 'Caracas – Antímano', 'Caracas – Macarao', 'Caracas – San Bernardino', 'Caracas – El Junquito', 'Caracas – La Pastora', 'Caracas – 23 de Enero'],
  },
  {
    id: 'falcon',
    name: 'Falcón',
    cities: ['Coro', 'Punto Fijo', 'Puerto Cumarebo', 'Tucacas', 'Chichiriviche', 'Dabajuro', 'Churuguara', 'La Vela de Coro', 'Mene de Mauroa', 'Pueblo Nuevo', 'Los Taques', 'Yaracal', 'Mirimire', 'Cabure', 'Judibana', 'Píritu', 'San Luis', 'Santa Cruz de Bucaral', 'Tocópero', 'Capatárida', 'Adícora'],
  },
  {
    id: 'guarico',
    name: 'Guárico',
    cities: ['San Juan de los Morros', 'Calabozo', 'Valle de la Pascua', 'Zaraza', 'Altagracia de Orituco', 'Tucupido', 'Camaguán', 'El Socorro', 'Ortiz', 'Las Mercedes del Llano', 'Chaguaramas', 'San José de Guaribe', 'Santa María de Ipire', 'El Sombrero', 'Cabruta', 'Guayabal', 'Lezama', 'San Rafael de Orituco'],
  },
  {
    id: 'la-guaira',
    name: 'La Guaira',
    cities: ['La Guaira', 'Maiquetía', 'Catia La Mar', 'Macuto', 'Caraballeda', 'Naiguatá', 'Carayaca', 'Camurí Chico', 'Tanaguarena', 'Carmen de Uria', 'El Junko'],
  },
  {
    id: 'lara',
    name: 'Lara',
    cities: ['Barquisimeto', 'Cabudare', 'Carora', 'El Tocuyo', 'Quíbor', 'Duaca', 'Sanare', 'Siquisique', 'Sarare', 'Cubiro', 'Aguada Grande', 'Bobare', 'Río Claro', 'Humocaro Bajo', 'Humocaro Alto', 'Baragua', 'Guarico', 'Tintorero'],
  },
  {
    id: 'merida',
    name: 'Mérida',
    cities: ['Mérida', 'El Vigía', 'Ejido', 'Tovar', 'Lagunillas', 'Bailadores', 'Santa Cruz de Mora', 'Tabay', 'Mucuchíes', 'Timotes', 'Nueva Bolivia', 'Santa Elena de Arenales', 'Arapuey', 'Zea', 'Canaguá', 'La Azulita', 'Tucaní', 'Guaraque', 'Pueblo Llano', 'Chiguará'],
  },
  {
    id: 'miranda',
    name: 'Miranda',
    cities: ['Los Teques', 'Guarenas', 'Guatire', 'Petare', 'Chacao', 'Baruta', 'El Hatillo', 'Charallave', 'Cúa', 'Ocumare del Tuy', 'Santa Teresa del Tuy', 'San Antonio de los Altos', 'Carrizal', 'Higuerote', 'Río Chico', 'San Francisco de Yare', 'Santa Lucía', 'Caucagua', 'Cúpira', 'San José de Barlovento', 'Mamporal', 'Araira', 'Paracotos', 'Tácata', 'Las Minas de Baruta', 'La Dolorita', 'Filas de Mariche'],
  },
  {
    id: 'monagas',
    name: 'Monagas',
    cities: ['Maturín', 'Punta de Mata', 'Caripito', 'Temblador', 'Caripe', 'Aguasay', 'Barrancas del Orinoco', 'Santa Bárbara', 'Uracoa', 'Aragua de Maturín', 'San Antonio de Maturín', 'Chaguaramal', 'El Furrial', 'Jusepín', 'Quiriquire'],
  },
  {
    id: 'nueva-esparta',
    name: 'Nueva Esparta',
    cities: ['Porlamar', 'La Asunción', 'Pampatar', 'Juan Griego', 'San Juan Bautista', 'Punta de Piedras', 'El Valle del Espíritu Santo', 'Boca de Río', 'Santa Ana', 'Los Robles', 'San Pedro de Coche', 'Villa Rosa', 'El Yaque', 'La Guardia'],
  },
  {
    id: 'portuguesa',
    name: 'Portuguesa',
    cities: ['Guanare', 'Acarigua', 'Araure', 'Turén (Villa Bruzual)', 'Píritu', 'Ospino', 'Biscucuy', 'Guanarito', 'Papelón', 'Agua Blanca', 'San Rafael de Onoto', 'Boconoíto', 'Chabasquén', 'La Aparición', 'Payara', 'Mesa de Cavacas', 'Santa Rosalía', 'El Playón'],
  },
  {
    id: 'sucre',
    name: 'Sucre',
    cities: ['Cumaná', 'Carúpano', 'Güiria', 'Cariaco', 'Araya', 'Marigüitar', 'Río Caribe', 'Casanay', 'Yaguaraparo', 'Irapa', 'Tunapuy', 'San Antonio del Golfo', 'Cumanacoa', 'El Pilar', 'Santa Fe', 'Mariguitar', 'Guaca', 'San José de Aerocuar'],
  },
  {
    id: 'tachira',
    name: 'Táchira',
    cities: ['San Cristóbal', 'Táriba', 'Rubio', 'San Antonio del Táchira', 'Ureña', 'La Fría', 'Colón', 'La Grita', 'Capacho Nuevo', 'Capacho Viejo', 'Santa Ana del Táchira', 'El Piñal', 'Michelena', 'Lobatera', 'Cordero', 'Pregonero', 'Queniquea', 'Abejales', 'Seboruco', 'San Josecito', 'Palmira', 'Coloncito', 'La Tendida', 'San Juan de Colón', 'Umuquena'],
  },
  {
    id: 'trujillo',
    name: 'Trujillo',
    cities: ['Trujillo', 'Valera', 'Boconó', 'Escuque', 'Motatán', 'Sabana de Mendoza', 'Carvajal', 'Pampán', 'Betijoque', 'La Puerta', 'Monte Carmelo', 'Carache', 'Chejendé', 'Santa Ana', 'La Quebrada', 'Sabana Grande', 'Pampanito', 'La Ceiba', 'Jajó', 'Mendoza Fría'],
  },
  {
    id: 'yaracuy',
    name: 'Yaracuy',
    cities: ['San Felipe', 'Yaritagua', 'Chivacoa', 'Nirgua', 'Cocorote', 'Independencia', 'Aroa', 'Urachiche', 'Sabana de Parra', 'Guama', 'Boraure', 'Farriar', 'Yumare', 'Marín', 'San Pablo', 'Campo Elías'],
  },
  {
    id: 'zulia',
    name: 'Zulia',
    cities: ['Maracaibo', 'Cabimas', 'Ciudad Ojeda', 'San Francisco', 'Santa Rita', 'Machiques', 'Santa Bárbara del Zulia', 'La Concepción', 'Lagunillas', 'Bachaquero', 'Mene Grande', 'Los Puertos de Altagracia', 'San Rafael de El Moján', 'Sinamaica', 'Villa del Rosario', 'La Cañada de Urdaneta', 'Caja Seca', 'Encontrados', 'San Carlos del Zulia', 'Tía Juana', 'El Venado', 'Casigua El Cubo', 'Paraguaipoa', 'Concepción', 'Bobures', 'Gibraltar', 'San Timoteo'],
  },
  {
    id: 'dependencias-federales',
    name: 'Dependencias Federales',
    cities: ['Los Roques (Gran Roque)', 'La Orchila', 'La Tortuga', 'Isla de Aves'],
  },
];

export const OTHER_CITY = 'Otra ciudad (escribir)';

export const findState = (name: string) => VENEZUELA_STATES.find((s) => s.name === name) ?? null;
