interface GoalSeekParams {
  Func: (...args: any[]) => number
  This: any
  aFuncParams: any[]
  oFuncArgTarget: {
    Position: number
    propStr?: string
  }
  Goal: number
  Tol?: number
  maxIter?: number
}

function goalSeek(oParams: GoalSeekParams): number | null {
  let g: number,
    Y: number = 0,
    Y1: number,
    OldTarget: number

  oParams.Tol = oParams.Tol || 0.001 // * Goal
  oParams.maxIter = oParams.maxIter || 1000

  //is the independent variable within an object?
  if (oParams.oFuncArgTarget.propStr) {
    //check if a guess has been provided
    if (
      !getObjVal(
        oParams.aFuncParams[oParams.oFuncArgTarget.Position],
        oParams.oFuncArgTarget.propStr
      )
    ) {
      //iterate through 100 guesses, max
      for (let i = 0; i < 100; i++) {
        const iGuess = Math.random()
        setObjVal(
          oParams.aFuncParams[oParams.oFuncArgTarget.Position],
          oParams.oFuncArgTarget.propStr,
          iGuess
        )
        if (oParams.Func.apply(oParams.This, oParams.aFuncParams)) {
          break
        }
        if (i === 99) {
          //we couldn't find any guess that worked!
          return null
        }
      }
    }
    //Iterate through the guesses
    for (let i = 0; i < oParams.maxIter; i++) {
      //define the root of the function as the error
      Y = oParams.Func.apply(oParams.This, oParams.aFuncParams) - oParams.Goal

      //was our initial guess a good one?
      if (Math.abs(Y) <= oParams.Tol) {
        return getObjVal(
          oParams.aFuncParams[oParams.oFuncArgTarget.Position],
          oParams.oFuncArgTarget.propStr
        )
      } else {
        OldTarget = getObjVal(
          oParams.aFuncParams[oParams.oFuncArgTarget.Position],
          oParams.oFuncArgTarget.propStr
        )
        setObjVal(
          oParams.aFuncParams[oParams.oFuncArgTarget.Position],
          oParams.oFuncArgTarget.propStr,
          OldTarget + Y
        )
        Y1 =
          oParams.Func.apply(oParams.This, oParams.aFuncParams) - oParams.Goal
        g = (Y1 - Y) / Y

        if (g === 0) {
          g = 0.0001
        }
        setObjVal(
          oParams.aFuncParams[oParams.oFuncArgTarget.Position],
          oParams.oFuncArgTarget.propStr,
          OldTarget - Y / g
        )
      }
    }
    if (Math.abs(Y) > oParams.Tol) {
      return null
    }
  } else {
    //check if a guess has been provided
    if (!oParams.aFuncParams[oParams.oFuncArgTarget.Position]) {
      //iterate through 100 guesses, max
      for (let i = 0; i < 100; i++) {
        const iGuess = Math.random()
        oParams.aFuncParams[oParams.oFuncArgTarget.Position] = iGuess
        if (oParams.Func.apply(oParams.This, oParams.aFuncParams)) {
          break
        }
        if (i === 99) {
          //we couldn't find any guess that worked!
          return null
        }
      }
    }
    //Iterate through the guesses
    for (let i = 0; i < oParams.maxIter; i++) {
      //define the root of the function as the error
      Y = oParams.Func.apply(oParams.This, oParams.aFuncParams) - oParams.Goal
      //was our initial guess a good one?
      if (Math.abs(Y) <= oParams.Tol) {
        return oParams.aFuncParams[oParams.oFuncArgTarget.Position]
      } else {
        OldTarget = oParams.aFuncParams[oParams.oFuncArgTarget.Position]
        oParams.aFuncParams[oParams.oFuncArgTarget.Position] = OldTarget + Y
        Y1 =
          oParams.Func.apply(oParams.This, oParams.aFuncParams) - oParams.Goal
        g = (Y1 - Y) / Y

        if (g === 0) {
          g = 0.0001
        }
        oParams.aFuncParams[oParams.oFuncArgTarget.Position] = OldTarget - Y / g
      }
    }
    if (Math.abs(Y) > oParams.Tol) {
      return null
    }
  }
  return null
}

//source (modified from original): http://stackoverflow.com/questions/18936915/dynamically-set-property-of-nested-object
//answerer: bpmason1; questioner: John B.
//answerer url: http://stackoverflow.com/users/2736119/bpmason1
//license: http://creativecommons.org/licenses/by-sa/3.0/legalcode
function setObjVal(Obj: any, propStr: string, Value: any) {
  let Schema = Obj // a moving reference to internal objects within obj
  const pList = propStr.split('.')
  const Len = pList.length

  for (let i = 0; i < Len - 1; i++) {
    const Elem = pList[i]
    if (!Schema[Elem]) Schema[Elem] = {}
    Schema = Schema[Elem]
  }
  Schema[pList[Len - 1]] = Value
}

//source (modified from original): http://stackoverflow.com/questions/4343028/in-javascript-test-for-property-deeply-nested-in-object-graph
//answerer: Zach; questioner: thisismyname
//answerer url: http://stackoverflow.com/users/230892/zach
//license: http://creativecommons.org/licenses/by-sa/3.0/legalcode
function getObjVal(Obj: any, propStr: string): any {
  const Parts = propStr.split('.')
  let Cur = Obj

  for (let i = 0; i < Parts.length; i++) {
    Cur = Cur[Parts[i]]
  }
  return Cur
}

export default goalSeek
