import '@prisma/adapter-pg';
import 'pg';
import 'bcrypt';
import 'pdfmake';
import 'write-excel-file/node';
import 'swagger-ui-dist';
import serverMod from '../dist/server.mjs';

export default serverMod.handler;
