import { AccountUpdate, Field, Mina, PrivateKey } from 'snarkyjs';
import { Square } from './Square.js';

console.log('SnarkyJS loaded');

const useProof = false;

const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);

const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];
const { privateKey: senderKey, publicKey: senderAccount } =
  Local.testAccounts[1];

// Create a public/private key pair. The public key is the address and where you deploy the zkApp to.
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

// Create an instance of Square - and deploy it to zkAppAddress
const zkAppInstance = new Square(zkAppAddress);
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
});
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

// Get the initial state of Square after deployment
const num0 = zkAppInstance.num.get();
console.log('Initial state of Square: ', num0.toString());

// Update zkApp account with a transaction
const updateTxn = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update(Field(9));
});
await updateTxn.prove();
await updateTxn.sign([senderKey]).send();
const num1 = zkAppInstance.num.get();
console.log('Updated state of Square after transaction: ', num1.toString());

// Adding a transaction that fails
try {
  const txn2 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update(Field(10));
  });
  await txn2.prove();
  await txn2.sign([senderKey]).send();
} catch (e: any) {
  console.log(e.message);
}
const num2 = zkAppInstance.num.get();
console.log('State of Square after failed transaction: ', num2.toString());

// Include the correct update
const txn3 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update(Field(81));
});
await txn3.prove();
await txn3.sign([senderKey]).send();

const num3 = zkAppInstance.num.get();
console.log('State of Square after correct transaction: ', num3.toString());

console.log('Shutting down');
