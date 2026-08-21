import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const RangRootsApp());
}

class RangRootsApp extends StatelessWidget {
  const RangRootsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Rang Roots',
      theme: ThemeData(
        colorSchemeSeed: Colors.deepOrange,
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
