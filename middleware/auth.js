const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const hashPassword = async(password)=>{
    let salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS))
    let hash = await bcrypt.hash(password,salt)
    return hash
}

const hashCompare = async(password,hash)=>{
    return await bcrypt.compare(password,hash)
}

const createToken = async(payload)=>{
    const token = await jwt.sign(payload,process.env.JWT_SECRET,{
        expiresIn:'7d'
    })
    return token
}

const decodeToken = async(token)=>{
    const payload = await jwt.decode(token)
    return payload
}

const validate = async (req, res, next) => {    
    try {
        let token = req.headers.authorization?.split(" ")[1];
        if (token) {
            jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return res.status(401).send({ message: "Token Expired" });
                    }
                    return res.status(401).send({ message: "Invalid Token" });
                }
                req.headers.userId = payload.id;
                next();
            });
        } else {
            return res.status(401).send({ message: "Token Not Found" });
        }
    } catch (error) {
        return res.status(500).send({ message: "Server Error", error });
    }
};
    const adminGaurd = async(req,res,next)=>{
        let Token = req.headers.authorization?.split(" ")[1]
        if(Token){
          let payload = await decodeToken(Token)
        //   console.log('payload',payload);
          
          if(payload.role ==="admin"){
            next()
          }
          else{
            res.status(401).send({message:"Admin only acces"})
          }
        }
        else{
            res.status(401).send({message:"Token not found"})
        }
    }


module.exports = {
    hashPassword,
    hashCompare,
    createToken,
    validate,
    adminGaurd
}