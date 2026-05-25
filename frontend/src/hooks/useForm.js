import { useState } from "react";

export const useForm = (initialValues) => {
  //Dùng useState để Lưu trữ Tất cả giá trị
  const [values, setValues] = useState(initialValues);

  //Hàn Xử Lý Sự Thay đổi có thể sử dụng cho bất kỳ input nào
  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({
      ...values,
      [name]: value,
    });
  };

  //Trả về state và hàm xử lý để component có thể sử dụng
  return { values, handleChange };
};
