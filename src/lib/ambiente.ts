/**
 * Dove sta girando il gestionale.
 *
 * Serve a una cosa sola ma importante: in test non si devono fare operazioni
 * che consumano risorse vere fuori di qui. Attivare una polizza prova brucia
 * una polizza reale sul portale federale e non si annulla, quindi in test si
 * rifiuta e basta.
 */
export const AMBIENTE = process.env.AMBIENTE === 'test' ? 'test' : 'prod';

export const inTest = AMBIENTE === 'test';
