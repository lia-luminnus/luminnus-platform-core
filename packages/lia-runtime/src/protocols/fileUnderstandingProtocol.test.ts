import { inferIntentMode, IntentMode, validateResponse } from './fileUnderstandingProtocol.js';

function runTests() {
    console.log('🧪 Iniciando testes do FileUnderstandingProtocol...');

    // Case 1: Incident Inference
    const test1 = inferIntentMode('não funcionou a integração', ['image/png']);
    console.log(`Test 1 (Incident): ${test1 === IntentMode.INCIDENT ? '✅' : '❌'}`);

    // Case 2: Content Inference
    const test2 = inferIntentMode('resuma este documento para mim', ['application/pdf']);
    console.log(`Test 2 (Content): ${test2 === IntentMode.CONTENT ? '✅' : '❌'}`);

    // Case 3: Dominance (Conflict)
    const test3 = inferIntentMode('transforma em documento mas corrige o erro', ['image/png']);
    console.log(`Test 3 (Dominance/Content): ${test3 === IntentMode.CONTENT ? '✅' : '❌'}`);

    // Case 4: QA Validation (Should Fail Incident without Fix/Validation)
    const badResponse = 'O print mostra um formulário com campos vazios.';
    const qa1 = validateResponse(badResponse);
    console.log(`QA 1 (Failed Incident): ${(!qa1.ok && qa1.errors.length > 0) ? '✅' : '❌'}`);

    // Case 5: QA Validation (Should Pass Incident with Fix/Validation)
    const goodResponse = `
1) **ACHADO PRINCIPAL**: Erro de validação no formulário.
2) **EVIDÊNCIA**: Console log indicando 400 Bad Request.
3) **CAUSA RAIZ PROVÁVEL**: Campo email ausente.
4) **CORREÇÃO MÍNIMA RECOMENDADA**:
• Adicionar required no campo email.
5) **VALIDAÇÃO**:
• Enviar formulário vazio.
• Verificar se erro 400 desaparece.
`;
    const qa2 = validateResponse(goodResponse);
    console.log(`QA 2 (Passed Incident): ${qa2.ok ? '✅' : '❌'}`);

    console.log('🏁 Testes concluídos.');
}

runTests();
