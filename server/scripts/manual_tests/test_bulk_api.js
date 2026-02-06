
// Native fetch in Node 18+

const API_BASE = 'http://localhost:3001/api';

const mockRca = {
    id: "RCA-TEST-BULK-01",
    what: "Teste de Importação via Script",
    analysis_type: "TYPE-01",
    status: "STATUS-01",
    start_date: "2025-01-01",
    participants: ["Tester"],
    root_causes: []
};

const mockAsset = {
    id: "ASSET-TEST-BULK",
    name: "Ativo de Teste Script",
    type: "AREA"
};

async function testBulk() {
    console.log('--- TESTANDO BULK API ---');

    // 1. Test Assets Bulk
    try {
        console.log('📤 Enviando Assets Bulk...');
        const res1 = await fetch(`${API_BASE}/assets/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([mockAsset])
        });
        const json1 = await res1.json();
        console.log(`📡 Status Assets: ${res1.status}`, json1);
    } catch (e) {
        console.error('❌ Falha Assets:', e.message);
    }

    // 2. Test RCA Bulk
    try {
        console.log('📤 Enviando RCA Bulk...');
        const res2 = await fetch(`${API_BASE}/rcas/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([mockRca])
        });
        const json2 = await res2.json();
        console.log(`📡 Status RCAs: ${res2.status}`, json2);
    } catch (e) {
        console.error('❌ Falha RCAs:', e.message);
    }
    // 3. Test Trigger Bulk
    try {
        console.log('📤 Enviando Trigger Bulk...');
        const mockTrigger = {
            id: "TRIGGER-TEST-BULK",
            area_id: "AREA-TRIGGER",
            start_date: "2025-01-01",
            end_date: "2025-01-02",
            stop_type: "TYPE-01",
            status: "OPEN"
        };
        const res3 = await fetch(`${API_BASE}/triggers/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([mockTrigger])
        });
        const json3 = await res3.json();
        console.log(`📡 Status Triggers: ${res3.status}`, json3);
    } catch (e) {
        console.error('❌ Falha Triggers:', e.message);
    }
}

testBulk();
