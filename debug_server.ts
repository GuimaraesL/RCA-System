
import { DatabaseConnection } from './server/src/v2/infrastructure/database/DatabaseConnection';
import { MigrationRunner } from './server/src/v2/infrastructure/database/MigrationRunner';

async function test() {
    try {
        console.log("Starting test...");
        const db = DatabaseConnection.getInstance();
        console.log("Initializing DB...");
        await db.initialize();
        console.log("Running migrations...");
        await new MigrationRunner().run();
        console.log("Success!");
        process.exit(0);
    } catch (e) {
        console.error("Failure:", e);
        process.exit(1);
    }
}

test();
