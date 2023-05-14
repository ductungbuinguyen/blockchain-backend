import express from 'express'
import { User } from '../entities/User';
import cors from 'cors';
import { generatePublicApiSignature, getContractNonce, getCurrentBlockTimestamp } from '../utils/contract';

const router = express.Router()

router.get('/', cors(), async (req, res) => {
  const merchantApiKey = req.get('bcps-api-key');
  const signature = req.get('bcps-signature');
  const { buyerEmail } = req.query;
  const existingUser = await User.findOne({
    where: { id: merchantApiKey },
    relations: ['contract', 'merchantMetaData'],
  });
  // console.log("merchantApiKey", merchantApiKey)
  // console.log("signature", signature)
  // console.log("existingUser", existingUser)
  // console.log("req query", req.query)
  if (!existingUser || !existingUser?.merchantMetaData) return res.sendStatus(403)
  const reGeneratedSignature = generatePublicApiSignature({
    body: JSON.stringify(req.query),
    secretKey: existingUser.merchantMetaData.merchantSecretKey
  })
  // console.log("reGeneratedSignature", reGeneratedSignature)
  if(signature !== reGeneratedSignature) return res.sendStatus(403)
  // console.log("pass signature")
  const nonce = await getContractNonce(existingUser?.contract?.address);
  // console.log("nonce", nonce)
  const timestamp = await getCurrentBlockTimestamp();
  // console.log("timestamp", timestamp)
  const buyerUser = await User.findOne({
    where: { email: buyerEmail },
    relations: ['contract'],
  });
  // console.log("buyer user", buyerUser)
  const buyerAddress = buyerUser?.metaMaskPublicKey
  // console.log('buyerAddress', buyerAddress)
  if(!nonce || !timestamp || !buyerAddress) res.sendStatus(500)
  // console.log('pass null data')
  const dataSend = {
    buyerAddress,
    nonce: nonce.toString(),
    currentBlockTimestamp: timestamp,
  }
  const generateDataSendSignature = generatePublicApiSignature({
    body: JSON.stringify(dataSend),
    secretKey: existingUser.merchantMetaData.merchantSecretKey,
  })
  // console.log("generateDataSendSignature", generateDataSendSignature)
  return res.set('bcps-signature', generateDataSendSignature).json(dataSend)
})

export default router