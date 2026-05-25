package com.electro.order.client;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserAddressDto {
    private Integer id;
    private String receiverName;
    @JsonAlias("phone")
    private String receiverPhone;
    private String province;
    private String district;
    private String ward;
    @JsonAlias("addressDetail")
    private String address;
    private Integer districtId;
    private String wardCode;
}
