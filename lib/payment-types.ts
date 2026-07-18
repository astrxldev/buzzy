export type SlipokResponse =
  | {
      success: true;
      data: {
        success: true;
        message: string;
        rqUID: string;
        language: string;
        transRef: string;
        sendingBank: string;
        receivingBank: string;
        transDate: string;
        transTime: string;
        sender: {
          displayName: string;
          name: string;
          proxy: {
            type: null;
            value: null;
          };
          account: {
            type: string;
            value: string;
          };
        };
        receiver: {
          displayName: string;
          name: string;
          proxy: {
            type: string;
            value: string;
          };
          account: {
            type: string;
            value: string;
          };
        };
        amount: number;
        paidLocalAmount: number;
        paidLocalCurrency: string;
        countryCode: string;
        transFeeAmount: number;
        ref1: string;
        ref2: string;
        ref3: string;
        toMerchantId: string;
      };
    }
  | {
      success: false;
      code: number;
      message: string;
    };
