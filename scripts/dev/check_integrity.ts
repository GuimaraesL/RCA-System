
import { DatabaseConnection } from '../../server/src/v2/infrastructure/database/DatabaseConnection';

async function checkIntegrity() {
    const db = DatabaseConnection.getInstance();
    await db.initialize();

    const countActions = db.query('SELECT COUNT(*) as c FROM actions')[0].c;
    const countRcas = db.query('SELECT COUNT(*) as c FROM rcas')[0].c;

    console.log(`\n📊 Stats:`);
    console.log(`- Total Actions: ${countActions}`);
    console.log(`- Total RCAs: ${countRcas}`);

    // Check Orphans
    const orphans = db.query(`
        SELECT a.id, a.rca_id 
        FROM actions a 
        LEFT JOIN rcas r ON a.rca_id = r.id 
        WHERE r.id IS NULL
    `);

    console.log(`\n👻 Orphan Actions (rca_id not found in rcas): ${orphans.length}`);
    if (orphans.length > 0) {
        console.log('Sample orphans:', orphans.slice(0, 5));
    } else {
        console.log('✅ Integrity Check Passed: All actions link to valid RCAs.');
    }

    // Check for "Unknown Analysis" causes (Empty Title?)
    const emptyTitles = db.query(`
        SELECT id, what 
        FROM rcas 
        WHERE what IS NULL OR trim(what) = ''
    `);
    if (emptyTitles.length > 0) {
        console.log(`\n⚠️ RCAs with empty 'what' (Title): ${emptyTitles.length}`);
    }
}

checkIntegrity();
