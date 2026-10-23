// ============================================================
// exemplos/exemplo-criptografia.js
// ============================================================
// EXEMPLO DE REFERÊNCIA - cenário FICTÍCIO (academia: clientes).
// Mostra como usar o utilitário utils/crypto-utils.js, que já
// está pronto. Vocês NÃO precisam escrever criptografia: só
// precisam saber QUANDO chamar cada função.
//
// Dá para rodar este arquivo e ver o resultado no terminal:
//     node exemplos/exemplo-criptografia.js
// (rode a partir da pasta "sistema", depois do npm install)
//
// ------------------------------------------------------------
// DOIS TIPOS DE PROTEÇÃO (não confundir!)
// ------------------------------------------------------------
//
//  1) SENHA  -> HASH (bcrypt)          caminho de UMA mão só
//     - Ninguém consegue "desfazer" o hash para descobrir a senha.
//     - Para conferir o login, NÃO se descriptografa nada:
//       compara-se a senha digitada com o hash salvo.
//       -> compararSenha(senhaDigitada, hashDoBanco)
//     - Quem GERA o hash é hashSenha(). (O login do sistema já usa
//       compararSenha, e os usuários do banco já vêm com hash.)
//
//  2) DADO SENSÍVEL QUE PRECISA APARECER DE NOVO (ex.: CPF)
//     -> CRIPTOGRAFIA (AES)            caminho de IDA e VOLTA
//     - criptografarCPF(texto)    : texto normal  -> texto embaralhado
//     - descriptografarCPF(texto) : embaralhado   -> texto normal
//     - Por que não usar hash? Porque a tela precisa MOSTRAR o CPF
//       de volta, e o hash não tem volta.
//
// ------------------------------------------------------------
// REGRA DE OURO: o banco guarda SEMPRE o valor protegido.
//   Tela/usuário        Back-end                    Banco
//   CPF normal   --->  criptografarCPF()   --->  CPF embaralhado
//   CPF normal   <---  descriptografarCPF() <---  CPF embaralhado
// ------------------------------------------------------------

// Dentro de uma rota (pasta routes/) o caminho do import é este:
//     import { criptografarCPF, descriptografarCPF } from '../utils/crypto-utils.js';
// Aqui, como este arquivo está na pasta exemplos/, é "../utils/...".
import {
    hashSenha,
    compararSenha,
    criptografarCPF,
    descriptografarCPF
} from '../utils/crypto-utils.js';


// ============================================================
// PARTE 1 - O que cada função faz (rode e observe o console)
// ============================================================
async function demonstracao() {

    // ---- SENHA: hash + comparação ----
    const hash = await hashSenha('minhaSenha123');        // async: use await
    console.log('Hash gerado:', hash);                    // começa com $2b$...

    console.log('Senha certa  ->', await compararSenha('minhaSenha123', hash)); // true
    console.log('Senha errada ->', await compararSenha('outraSenha', hash));    // false

    // Repare: gerar o hash DE NOVO dá um texto diferente (isso é normal!).
    // Por isso NUNCA se compara hash com ===. Sempre use compararSenha().
    const hash2 = await hashSenha('minhaSenha123');
    console.log('Hashes iguais?', hash === hash2);                               // false
    console.log('Mas os dois conferem ->', await compararSenha('minhaSenha123', hash2)); // true

    // ---- CPF: criptografar e descriptografar ----
    const cpfProtegido = criptografarCPF('123.456.789-09');   // NÃO é async
    console.log('CPF no banco :', cpfProtegido);              // texto embaralhado (hexadecimal)
    console.log('CPF na tela  :', descriptografarCPF(cpfProtegido)); // 123.456.789-09
}


// ============================================================
// PARTE 2 - Onde chamar dentro das rotas (esqueleto de exemplo)
// ============================================================
// Os trechos abaixo estão em comentário de propósito: é só o
// "desenho" do padrão, para vocês adaptarem às rotas do sistema.
// A estrutura (router, criarCliente, try/catch, connect/end) é a
// mesma já usada nas outras rotas.
//
// ---------- A) CADASTRAR (POST): criptografa ANTES do INSERT ----------
//
//   router.post('/', verificarSessao, async (req, res) => {
//       const { nome, cpf, senha } = req.body;
//       const cliente = criarCliente();
//       try {
//           const cpfProtegido = criptografarCPF(cpf);   // 1) protege
//           const senhaHash = await hashSenha(senha);    // (async -> await)
//
//           await cliente.connect();
//           await cliente.query(
//               'INSERT INTO clientes (nome, cpf, senha) VALUES ($1, $2, $3)',
//               [nome, cpfProtegido, senhaHash]          // 2) grava o PROTEGIDO
//           );
//           res.status(201).json({ mensagem: 'Cliente cadastrado' });
//       } catch (erro) { ... } finally { await cliente.end(); }
//   });
//
// ---------- B) LISTAR (GET): descriptografa DEPOIS do SELECT ----------
//
//   const resultado = await cliente.query('SELECT id, nome, cpf FROM clientes');
//
//   // O banco devolve o cpf embaralhado. Antes de enviar para a tela,
//   // troque o valor de cada linha pelo valor normal:
//   const clientes = resultado.rows.map(linha => ({
//       ...linha,                              // copia id, nome, ...
//       cpf: descriptografarCPF(linha.cpf)     // ...e sobrescreve o cpf
//   }));
//   res.json(clientes);                        // envia a lista já ajustada
//
//   (Alternativa com for: percorra resultado.rows e faça
//    linha.cpf = descriptografarCPF(linha.cpf); em cada uma.)
//
// ---------- C) EDITAR (PUT): igual ao POST, criptografa antes do UPDATE ----------
//
//   const cpfProtegido = criptografarCPF(req.body.cpf);
//   await cliente.query(
//       'UPDATE clientes SET nome = $1, cpf = $2 WHERE id = $3',
//       [req.body.nome, cpfProtegido, req.params.id]
//   );
//
// ---------- D) LOGIN: NÃO descriptografa, COMPARA ----------
//
//   const usuario = resultado.rows[0];                      // linha do banco
//   const confere = await compararSenha(senhaDigitada, usuario.senha);
//   if (!confere) { return res.status(401).json({ erro: 'Login ou senha inválidos' }); }
//
//   (Isto já está pronto em routes/auth.js - vale ler para ver.)


// ============================================================
// PARTE 3 - Erros comuns (confiram antes de pedir ajuda)
// ============================================================
//
//  1) CPF aparece como letras e números estranhos na tela
//     -> faltou descriptografarCPF() na hora de LISTAR.
//
//  2) CPF aparece estranho ao clicar em "Editar"
//     -> o formulário é preenchido com os dados da lista; se a lista
//        já vem descriptografada, o formulário também vem. Se não vem,
//        o problema está na listagem (item 1).
//
//  3) CPF gravado em texto normal no banco
//     -> faltou criptografarCPF() antes do INSERT/UPDATE.
//
//  4) Erro ao descriptografar (ex.: "bad decrypt" / "wrong final block length")
//     -> o valor que entrou NÃO estava criptografado (ou foi
//        criptografado duas vezes). Só descriptografe o que veio do
//        banco, e só uma vez.
//
//  5) Login nunca funciona
//     -> a senha do banco precisa ser um HASH (começa com $2b$).
//        Se cadastrarem usuário com senha em texto normal, o
//        compararSenha() sempre dará false. Use hashSenha() ao cadastrar.
//
//  6) "hashSenha(...) não é uma string" / senha aparece como [object Promise]
//     -> faltou o await. hashSenha e compararSenha são async;
//        criptografarCPF e descriptografarCPF NÃO são.
//
//  7) Comparar a senha com === ou com o hash gerado de novo
//     -> nunca funciona (cada hash é diferente). Use compararSenha().


demonstracao().catch(erro => console.error('Erro na demonstração:', erro));