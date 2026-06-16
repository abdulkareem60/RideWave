package com.ridewave.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

@Entity
public class Passenger extends AppUser {

    private String preferences;
}